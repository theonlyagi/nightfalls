import uWS from 'uWebSockets.js';
import {
  WORLD_W, WORLD_H, ROOM_MAX_PLAYERS, ROOM_MIN_PLAYERS, MATCH_START_COUNTDOWN_MS, TICK_MS,
  ZOMBIE_MAX, ZOMBIE_SPAWN_INTERVAL_MS, ZOMBIE_RADIUS, ZOMBIE_DAMAGE, ZOMBIE_HIT_COOLDOWN_MS, ZOMBIE_KILL_XP,
  ZOMBIE_CHASE_SPEED,
  BULLET_SPEED_PER_SEC, BULLET_LIFE_MS, BULLET_RADIUS, BULLET_DAMAGE,
  PLAYER_RADIUS, PLAYER_MAX_HP, MAX_PLAYER_SPEED_PER_MS,
  BUILD_REACH, STRUCTURE_MAX, STRUCTURE_DEFS, TOWER_LEVELS, towerMaxHp,
  WALL_HP_BY_TIER, SPIKE_HP_BY_TIER, SPIKE_DAMAGE_BY_TIER, SPIKE_HIT_COOLDOWN_MS,
  CAMPFIRE_HEAL_RADIUS, CAMPFIRE_HEAL_RATE,
  WEAPON_DEFS, BASE_FIRE_RATE, OVERCLOCKED_FIRE_RATE_MUL, SHOT_INTERVAL_SLACK,
  BURN_CHANCE, BURN_DURATION_MS, BURN_DAMAGE_FRACTION, VAMPIRE_LIFESTEAL_FRACTION,
  TITAN_MAX_HP_BONUS, TITAN_RADIUS_MUL, OVERCLOCKED_RADIUS_MUL,
  DAY_NIGHT_TOTAL_MS, BLOOD_MOON_HP_DMG_MULTIPLIER, BLOOD_MOON_SPAWN_SPEEDUP,
  RoomPhase, StructureKind, TowerKind, WeaponKind, MutationKind,
  clamp, dist,
} from './protocol.js';

/** Generous multiplier on top of the base speed cap to absorb normal network jitter. */
const SPEED_CHECK_SLACK = 1.5;

export interface ConnectionData {
  id: string;
  name: string;
  sessionToken: string;
  connectedAt: number;
  roomId: string;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  xp: number;
  level: number;
  xpToNext: number;
  lastMoveAt: number;
  lastMoveX: number;
  lastMoveY: number;
  lastShotAt: number;
  ready: boolean;
  /** Equipped weapon/mutation - 'pistol'/null are the solo-mode defaults.
   *  radius starts at PLAYER_RADIUS and only changes via a mutation choice
   *  (titan/overclocked), mirroring MUTATION_DEFS' apply() functions
   *  exactly (src/constants.ts) - used for the move clamp and zombie-vs-
   *  player collision so a titan/overclocked player has a correctly-sized
   *  hitbox server-side, not just a client-side visual change. */
  weapon: WeaponKind;
  mutation: MutationKind | null;
  radius: number;
  weaponChosen: boolean;
  mutationChosen: boolean;
}

export interface ZombieState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lastHitPlayerAt: number;
  lastSpikeHitAt: number;
  lastHitStructureAt: number;
  /** Pyromaniac burn DoT - set on a direct (non-explosive) hit from a
   *  'burn'-flagged bullet, ticked down every server tick (see tickBurns()). */
  burnUntil?: number;
  burnDamagePerSec?: number;
  burnOwnerId?: string;
}

export interface BulletState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** Weapon-specific combat fields, set once at spawn time in handleShoot()
   *  from the shooter's equipped weapon/mutation (see WEAPON_DEFS in
   *  protocol.ts) - damage/explosive/explodeRadius/burn all default-absent
   *  behavior was previously a single flat BULLET_DAMAGE regardless of
   *  weapon; this is what makes per-weapon damage/pellets/splash/burn
   *  possible without changing the ShootPacket wire format (the server
   *  already knows the shooter's weapon/mutation from stored PlayerState). */
  damage: number;
  explosive?: boolean;
  explodeRadius?: number;
  burn?: boolean;
}

/** Phase 1: existence/position/combat sync only, no ownership tracking —
 *  any player can upgrade any structure (matches campfire's heal-anyone
 *  design), and tower/spike kills grant no XP (no owner to grant it to). */
export interface StructureState {
  id: string;
  type: StructureKind;
  x: number;
  y: number;
  angle: number;
  aimAngle: number;
  tier: number;  // wall/spike only, 0-2
  level: number; // towers only, 1-5
  hp: number;
  maxHp: number;
  lastShot: number;
}

let nextZombieId = 1;
function generateZombieId(): string {
  return 'zombie_' + (nextZombieId++);
}

let nextBulletId = 1;
function generateBulletId(): string {
  return 'bullet_' + (nextBulletId++);
}

let nextStructureId = 1;
function generateStructureId(): string {
  return 'structure_' + (nextStructureId++);
}

function isTowerKind(type: StructureKind): type is TowerKind {
  return type in TOWER_LEVELS;
}

/**
 * One isolated match. Owns its own players/zombies/bullets and its own tick —
 * nothing here is visible to, or affected by, any other room. Created on
 * demand by RoomManager and torn down (timers cleared) once empty.
 */
export class Room {
  readonly id: string;
  readonly sockets = new Map<string, uWS.WebSocket<ConnectionData>>();
  readonly players = new Map<string, PlayerState>();
  readonly zombies = new Map<string, ZombieState>();
  readonly bullets = new Map<string, BulletState>();
  readonly structures = new Map<string, StructureState>();

  private phase: RoomPhase = 'waiting';
  private countdownEndsAt: number | null = null;
  private countdownTimer: ReturnType<typeof setTimeout> | undefined;

  // Simulation only runs once the match is active — these stay unset until then.
  private zombieSpawnTimer: ReturnType<typeof setInterval> | undefined;
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private onEmpty: (room: Room) => void;

  /** Server-authoritative day/night cycle - mirrors src/state.ts's dayNight
   *  object (minus the client-only nightSpawnTimer, which drives a purely
   *  cosmetic client-side random-spawn branch that's out of scope here; the
   *  server's own zombie spawn timer is gated/sped-up separately below). */
  private dayNightState = { time: 0, factor: 0, isNight: false, nightCount: 0 };
  private bloodMoonActive = false;

  constructor(id: string, onEmpty: (room: Room) => void) {
    this.id = id;
    this.onEmpty = onEmpty;
  }

  get size(): number {
    return this.sockets.size;
  }

  get isFull(): boolean {
    return this.size >= ROOM_MAX_PLAYERS;
  }

  get roomPhase(): RoomPhase {
    return this.phase;
  }

  destroy(): void {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    if (this.zombieSpawnTimer) clearInterval(this.zombieSpawnTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
  }

  private broadcast(payload: string): void {
    for (const ws of this.sockets.values()) {
      ws.send(payload);
    }
  }

  private broadcastLobby(): void {
    this.broadcast(JSON.stringify({
      type: 'lobby',
      phase: this.phase,
      players: Array.from(this.players.values()).map(p => ({ id: p.id, name: p.name, ready: p.ready })),
      countdownEndsAt: this.countdownEndsAt,
    }));
  }

  private broadcastPlayers(): void {
    this.broadcast(JSON.stringify({
      type: 'players',
      players: Array.from(this.players.values()).map(p => ({
        id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle, hp: p.hp, maxHp: p.maxHp, alive: p.alive,
        xp: p.xp, level: p.level, xpToNext: p.xpToNext,
      })),
    }));
  }

  private broadcastZombies(): void {
    this.broadcast(JSON.stringify({
      type: 'zombies',
      zombies: Array.from(this.zombies.values()).map(z => ({
        id: z.id, x: z.x, y: z.y, hp: z.hp, maxHp: z.maxHp,
      })),
    }));
  }

  private broadcastBullets(): void {
    this.broadcast(JSON.stringify({
      type: 'bullets',
      bullets: Array.from(this.bullets.values()).map(b => ({
        id: b.id, ownerId: b.ownerId, x: b.x, y: b.y, explosive: b.explosive,
      })),
    }));
  }

  private broadcastStructures(): void {
    this.broadcast(JSON.stringify({
      type: 'structures',
      structures: Array.from(this.structures.values()).map(s => ({
        id: s.id, type: s.type, x: s.x, y: s.y, angle: s.angle, aimAngle: s.aimAngle,
        tier: s.tier, level: s.level, hp: s.hp, maxHp: s.maxHp,
      })),
    }));
  }

  private broadcastDayNight(): void {
    this.broadcast(JSON.stringify({
      type: 'daynight',
      time: this.dayNightState.time, factor: this.dayNightState.factor,
      isNight: this.dayNightState.isNight, nightCount: this.dayNightState.nightCount,
      bloodMoonActive: this.bloodMoonActive,
    }));
  }

  /** Adds a live connection. `restored` carries prior state on a reconnect. */
  addConnection(ws: uWS.WebSocket<ConnectionData>, id: string, name: string, restored?: PlayerState): void {
    this.sockets.set(id, ws);
    const now = Date.now();
    this.players.set(id, restored ?? {
      id, name, x: WORLD_W / 2, y: WORLD_H / 2, angle: 0,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, alive: true,
      xp: 0, level: 1, xpToNext: 50,
      lastMoveAt: now, lastMoveX: WORLD_W / 2, lastMoveY: WORLD_H / 2,
      lastShotAt: 0, ready: false,
      weapon: 'pistol', mutation: null, radius: PLAYER_RADIUS,
      weaponChosen: false, mutationChosen: false,
    });

    // Bring the new/rejoining client up to date immediately.
    ws.send(JSON.stringify({ type: 'players', players: Array.from(this.players.values()) }));
    ws.send(JSON.stringify({ type: 'zombies', zombies: Array.from(this.zombies.values()) }));
    ws.send(JSON.stringify({ type: 'bullets', bullets: Array.from(this.bullets.values()) }));
    ws.send(JSON.stringify({ type: 'structures', structures: Array.from(this.structures.values()) }));
    ws.send(JSON.stringify({
      type: 'daynight',
      time: this.dayNightState.time, factor: this.dayNightState.factor,
      isNight: this.dayNightState.isNight, nightCount: this.dayNightState.nightCount,
      bloodMoonActive: this.bloodMoonActive,
    }));

    this.broadcastPlayers();
    // A new (unready) joiner invalidates any countdown already in progress.
    this.reevaluateLobby();
  }

  removeConnection(id: string): PlayerState | undefined {
    this.sockets.delete(id);
    const player = this.players.get(id);
    this.players.delete(id);
    this.broadcastPlayers();
    if (this.sockets.size === 0) {
      this.onEmpty(this);
      return player;
    }
    this.reevaluateLobby();
    return player;
  }

  /** Validated move: rejects implausible speed/teleport, clamps to world bounds. */
  handleMove(id: string, x: number, y: number, angle: number): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;

    const now = Date.now();
    const dt = now - p.lastMoveAt;
    const distance = dist(p.lastMoveX, p.lastMoveY, x, y);
    // dt<=0 guards against duplicate/out-of-order timestamps dividing by zero;
    // a generous slack factor avoids false rejections from normal network jitter.
    if (dt > 0) {
      const impliedSpeed = distance / dt;
      if (impliedSpeed > MAX_PLAYER_SPEED_PER_MS * SPEED_CHECK_SLACK) {
        console.warn(`[reject] ${id} implausible move: ${impliedSpeed.toFixed(3)} u/ms`);
        return;
      }
    }

    p.x = clamp(x, p.radius, WORLD_W - p.radius);
    p.y = clamp(y, p.radius, WORLD_H - p.radius);
    p.angle = angle;
    p.lastMoveAt = now;
    p.lastMoveX = p.x;
    p.lastMoveY = p.y;
    // No broadcast here — the tick loop already rebroadcasts every player at
    // a fixed TICK_MS cadence. Broadcasting per-move-packet too meant every
    // client's move (sent every 80ms regardless of whether they're actually
    // moving) triggered its own full-roster serialize+send, stacking a
    // broadcast storm on top of the tick that scaled with player count.
  }

  /** Validated shoot: per-weapon+mutation rate-limited, ignored for dead
   *  players. Spawns the exact pellet pattern/damage/speed/life/explosive/
   *  burn combination src/systems/combat.ts's tryShoot() would in solo mode
   *  — the server already knows the shooter's equipped weapon/mutation from
   *  stored PlayerState (see handleWeaponChoice/handleMutationChoice), so
   *  ShootPacket itself doesn't need to carry that — it's still just
   *  {type:'shoot', angle}. */
  handleShoot(id: string, angle: number): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;

    const wdef = WEAPON_DEFS[p.weapon];
    const fireRateMul = wdef.fireRateMul * (p.mutation === 'overclocked' ? OVERCLOCKED_FIRE_RATE_MUL : 1);
    const minInterval = (1000 / (BASE_FIRE_RATE * fireRateMul)) * SHOT_INTERVAL_SLACK;

    const now = Date.now();
    if (now - p.lastShotAt < minInterval) return;
    p.lastShotAt = now;

    const damage = BULLET_DAMAGE * wdef.damageMul;
    // vx/vy are the per-tick displacement tickBulletsMovement() adds each
    // tick, so the per-second speed must be scaled down by the tick
    // interval here — same reasoning as ZOMBIE_CHASE_SPEED's moveDist.
    const perTickSpeed = BULLET_SPEED_PER_SEC * (wdef.bulletSpeedMul || 1) * (TICK_MS / 1000);
    const lifeTicks = Math.round((BULLET_LIFE_MS * (wdef.bulletLifeMul || 1)) / TICK_MS);
    // Rolled once per shot, shared by every pellet spawned from it — matches
    // tryShoot() exactly (all 3 shotgun pellets share one burn roll).
    const willBurn = p.mutation === 'pyromaniac' && Math.random() < BURN_CHANCE;

    const spawnBullet = (shotAngle: number, originOffset: number): void => {
      const perpX = Math.cos(shotAngle + Math.PI / 2), perpY = Math.sin(shotAngle + Math.PI / 2);
      const forward = p.radius + 32;
      const bid = generateBulletId();
      const b: BulletState = {
        id: bid, ownerId: id,
        x: p.x + Math.cos(shotAngle) * forward + perpX * originOffset,
        y: p.y + Math.sin(shotAngle) * forward + perpY * originOffset,
        vx: Math.cos(shotAngle) * perTickSpeed, vy: Math.sin(shotAngle) * perTickSpeed,
        life: lifeTicks, damage,
      };
      if (wdef.explosive) { b.explosive = true; b.explodeRadius = wdef.explodeRadius; }
      if (willBurn) b.burn = true;
      this.bullets.set(bid, b);
    };

    // Pellet pattern hardcoded by weapon name, matching tryShoot() exactly
    // (the client's `pellets` field is likewise declared but never read).
    if (p.weapon === 'dualguns') {
      spawnBullet(angle, -9);
      spawnBullet(angle, 9);
    } else if (p.weapon === 'shotgun') {
      const spread = wdef.spreadRad || 0.2;
      spawnBullet(angle - spread, 0);
      spawnBullet(angle, 0);
      spawnBullet(angle + spread, 0);
    } else {
      spawnBullet(angle, 0);
    }
  }

  /** Validated weapon choice: server independently enforces the level gate
   *  and one-shot-only semantics rather than trusting the client, since a
   *  modified client could otherwise send this at level 1 or repeatedly
   *  swap weapons mid-match. 'pistol' is already rejected at the packet-
   *  validator level (isWeaponChoicePacket). */
  handleWeaponChoice(id: string, weapon: WeaponKind): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;
    if (p.level < 15 || p.weaponChosen) return;

    p.weapon = weapon;
    p.weaponChosen = true;
    this.broadcastPlayers();
  }

  /** Validated mutation choice: same server-side enforcement as weapon
   *  choice above. Applies the exact same one-time stat deltas as the
   *  client's MUTATION_DEFS[mutation].apply() (src/constants.ts) - titan/
   *  overclocked change maxHp/hp/radius, vampire/pyromaniac are no-ops here
   *  (their effects live entirely in handleShoot()/resolveCollisions()). */
  handleMutationChoice(id: string, mutation: MutationKind): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;
    if (p.level < 25 || p.mutationChosen) return;

    p.mutation = mutation;
    p.mutationChosen = true;
    if (mutation === 'titan') {
      p.maxHp += TITAN_MAX_HP_BONUS;
      p.hp += TITAN_MAX_HP_BONUS;
      p.radius *= TITAN_RADIUS_MUL;
    } else if (mutation === 'overclocked') {
      p.radius *= OVERCLOCKED_RADIUS_MUL;
    }
    this.broadcastPlayers();
  }

  /** Sets one player's ready flag and re-evaluates whether a countdown should start/cancel. */
  handleReady(id: string, ready: boolean): void {
    if (this.phase === 'active') return; // ready toggles are meaningless once the match is running
    const p = this.players.get(id);
    if (!p) return;
    p.ready = ready;
    this.reevaluateLobby();
  }

  /** Validated build: rejects if not in-reach, room is at the structure cap
   *  (DoS safety net — resource cost isn't server-validated yet, see
   *  protocol.ts), or the player doesn't exist/isn't alive. */
  handleBuild(id: string, kind: StructureKind, x: number, y: number, angle: number): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;
    if (this.structures.size >= STRUCTURE_MAX) return;
    if (dist(p.x, p.y, x, y) > BUILD_REACH) return;

    const def = STRUCTURE_DEFS[kind];
    const isWall = kind === 'wall';
    const isSpike = kind === 'spike';
    const hp = isWall ? WALL_HP_BY_TIER[0] : isSpike ? SPIKE_HP_BY_TIER[0] : def.hp;

    const sid = generateStructureId();
    this.structures.set(sid, {
      id: sid, type: kind,
      x: clamp(x, 0, WORLD_W), y: clamp(y, 0, WORLD_H), angle, aimAngle: angle,
      tier: 0, level: isTowerKind(kind) ? 1 : 0,
      hp, maxHp: hp, lastShot: 0,
    });
    this.broadcastStructures();
  }

  /** Validated upgrade: wall/spike bump tier (max 2), towers bump level (max
   *  5); either way, fully heals to the new maxHp, matching the client's
   *  upgradeInspectedStructure() behavior exactly. campfire/shop/factory
   *  have no upgrade path (silently ignored, matching the client). */
  handleUpgrade(id: string, structureId: string): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;
    const s = this.structures.get(structureId);
    if (!s) return;
    if (dist(p.x, p.y, s.x, s.y) > BUILD_REACH) return;

    if (s.type === 'wall') {
      if (s.tier >= WALL_HP_BY_TIER.length - 1) return;
      s.tier += 1;
      s.maxHp = WALL_HP_BY_TIER[s.tier];
    } else if (s.type === 'spike') {
      if (s.tier >= SPIKE_HP_BY_TIER.length - 1) return;
      s.tier += 1;
      s.maxHp = SPIKE_HP_BY_TIER[s.tier];
    } else if (isTowerKind(s.type)) {
      if (s.level >= 5) return;
      s.level += 1;
      s.maxHp = towerMaxHp(s.type, s.level);
    } else {
      return;
    }
    s.hp = s.maxHp;
    this.broadcastStructures();
  }

  /** Validated remove: same reach/existence check as build/upgrade, no
   *  ownership restriction (matches upgrade's "any player can upgrade any
   *  structure" Phase 1 model). Resource refund is client-local bookkeeping
   *  only, same as build cost — the server doesn't track wood/stone. */
  handleRemove(id: string, structureId: string): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;
    const s = this.structures.get(structureId);
    if (!s) return;
    if (dist(p.x, p.y, s.x, s.y) > BUILD_REACH) return;

    this.structures.delete(structureId);
    this.broadcastStructures();
  }

  /**
   * Any membership or ready-state change lands here. Any in-progress countdown
   * is always cancelled first, then a fresh one starts if the room currently
   * qualifies (2-4 players, everyone ready) — so unreadying, someone new
   * joining mid-countdown, or a player leaving all correctly reset the clock
   * rather than letting a stale countdown finish with the wrong roster.
   */
  private reevaluateLobby(): void {
    this.cancelCountdown();
    if (this.phase !== 'active') {
      const players = Array.from(this.players.values());
      const allReady = players.length >= ROOM_MIN_PLAYERS && players.length <= ROOM_MAX_PLAYERS && players.every(p => p.ready);
      if (allReady) {
        this.phase = 'countdown';
        this.countdownEndsAt = Date.now() + MATCH_START_COUNTDOWN_MS;
        this.countdownTimer = setTimeout(() => this.tryStartMatch(), MATCH_START_COUNTDOWN_MS);
      }
    }
    this.broadcastLobby();
  }

  private cancelCountdown(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = undefined;
    }
    if (this.phase === 'countdown') this.phase = 'waiting';
    this.countdownEndsAt = null;
  }

  /** Fires when a countdown naturally elapses. Re-checks the roster is still
   *  valid — it normally always is, since any disqualifying change already
   *  cancelled the countdown via reevaluateLobby, but this is the safety net. */
  private tryStartMatch(): void {
    this.countdownTimer = undefined;
    const players = Array.from(this.players.values());
    const stillQualifies = players.length >= ROOM_MIN_PLAYERS && players.length <= ROOM_MAX_PLAYERS && players.every(p => p.ready);
    if (!stillQualifies) {
      this.cancelCountdown();
      this.broadcastLobby();
      return;
    }
    this.activateMatch();
  }

  private activateMatch(): void {
    this.phase = 'active';
    this.countdownEndsAt = null;
    // Mirrors solo's resetGame() zeroing dayNight/bloodMoon at match start.
    this.dayNightState = { time: 0, factor: 0, isNight: false, nightCount: 0 };
    this.bloodMoonActive = false;
    this.zombieSpawnTimer = setInterval(() => this.maybeSpawnZombie(), ZOMBIE_SPAWN_INTERVAL_MS);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.broadcastLobby();
  }

  /** Advances the cosine-eased day/night cycle by one tick, matching
   *  src/systems/wave.ts's updateDayNight() formula exactly (dt=TICK_MS per
   *  call here instead of a variable frame dt, same fixed-dt-per-tick
   *  pattern already used for ZOMBIE_CHASE_SPEED/bullet speed elsewhere in
   *  this file). No banner/HUD calls - server has no UI; those are the
   *  client's job once it receives the broadcasted state (see
   *  src/net/matchSync.ts's net.onDayNight). */
  private updateDayNight(): void {
    const d = this.dayNightState;
    d.time = (d.time + TICK_MS) % DAY_NIGHT_TOTAL_MS;
    const frac = d.time / DAY_NIGHT_TOTAL_MS;
    d.factor = (1 - Math.cos(frac * Math.PI * 2)) / 2;
    const wasNight = d.isNight;
    d.isNight = d.factor > 0.5;

    if (d.isNight !== wasNight) {
      if (d.isNight) {
        d.nightCount += 1;
        this.bloodMoonActive = d.nightCount % 3 === 0;
      } else {
        this.bloodMoonActive = false;
      }
      this.resyncZombieSpawnInterval();
    }
  }

  /** Rebuilds the zombie-spawn interval to reflect the current Blood Moon
   *  state - maybeSpawnZombie() runs on its own independent setInterval
   *  (set up in activateMatch()), separate from the main tick() timer, so
   *  a transition edge needs to actually replace that interval rather than
   *  just flipping a flag it already reads. Called only on isNight/
   *  bloodMoonActive transitions (at most twice per ~110s cycle), not
   *  every tick. */
  private resyncZombieSpawnInterval(): void {
    if (this.zombieSpawnTimer) clearInterval(this.zombieSpawnTimer);
    const interval = ZOMBIE_SPAWN_INTERVAL_MS / (this.bloodMoonActive ? BLOOD_MOON_SPAWN_SPEEDUP : 1);
    this.zombieSpawnTimer = setInterval(() => this.maybeSpawnZombie(), interval);
  }

  /** No spawning during day, matching solo's updateWaves() exact rule. */
  private maybeSpawnZombie(): void {
    if (!this.dayNightState.isNight) return;
    if (this.zombies.size >= ZOMBIE_MAX) return;
    const id = generateZombieId();
    const hp = Math.round(30 * (this.bloodMoonActive ? BLOOD_MOON_HP_DMG_MULTIPLIER : 1));
    this.zombies.set(id, {
      id,
      x: Math.random() * WORLD_W,
      y: Math.random() * WORLD_H,
      hp, maxHp: hp,
      lastHitPlayerAt: 0,
      lastSpikeHitAt: 0,
      lastHitStructureAt: 0,
    });
  }

  /** Each zombie beelines for the nearest alive player at a flat chase speed
   *  (see ZOMBIE_CHASE_SPEED's doc comment — no per-type speeds server-side).
   *  Falls back to the old random jitter only when no one is alive to chase,
   *  so zombies don't freeze in place rather than a deliberate "safe" state.
   *  No obstacle avoidance/collision with structures — matches the rest of
   *  this server's model, where proximity drives damage but never blocks
   *  movement (see the zombie-vs-structure damage loop in resolveCollisions
   *  for the same simplification applied there). */
  private tickZombiesMovement(): void {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
    const moveDist = ZOMBIE_CHASE_SPEED * (TICK_MS / 1000);

    for (const z of this.zombies.values()) {
      if (alivePlayers.length === 0) {
        z.x = clamp(z.x + (Math.random() - 0.5) * 20, 0, WORLD_W);
        z.y = clamp(z.y + (Math.random() - 0.5) * 20, 0, WORLD_H);
        continue;
      }

      let target = alivePlayers[0];
      let bestDist = dist(z.x, z.y, target.x, target.y);
      for (const p of alivePlayers) {
        const d = dist(z.x, z.y, p.x, p.y);
        if (d < bestDist) { bestDist = d; target = p; }
      }

      const dx = target.x - z.x, dy = target.y - z.y;
      const len = bestDist || 1;
      z.x = clamp(z.x + (dx / len) * moveDist, 0, WORLD_W);
      z.y = clamp(z.y + (dy / len) * moveDist, 0, WORLD_H);
    }
  }

  private tickBulletsMovement(): void {
    for (const b of this.bullets.values()) {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;
      const outOfBounds = b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H;
      if (b.life <= 0 || outOfBounds) {
        this.bullets.delete(b.id);
      }
    }
  }

  /** Applies a hit's damage/lifesteal/burn-tag to one zombie, shared by both
   *  the direct-hit and explosive-splash paths below. Returns true if the
   *  zombie died from this hit (caller removes it and stops iterating). */
  private applyBulletHit(b: BulletState, z: ZombieState, dmg: number): boolean {
    z.hp -= dmg;
    if (b.ownerId) {
      const owner = this.players.get(b.ownerId);
      if (owner && owner.mutation === 'vampire') {
        owner.hp = Math.min(owner.maxHp, owner.hp + dmg * VAMPIRE_LIFESTEAL_FRACTION);
      }
    }
    // Burn never transfers to explosive splash victims — matches an
    // existing solo-mode quirk (grenadelauncher+pyromaniac never actually
    // burns anyone, since explodeBullet() never reads the bullet's burn
    // flag) that's preserved here rather than "fixed", per the requirement
    // to reproduce solo behavior exactly, bugs included.
    if (!b.explosive && b.burn) {
      z.burnUntil = Date.now() + BURN_DURATION_MS;
      z.burnDamagePerSec = b.damage * BURN_DAMAGE_FRACTION;
      z.burnOwnerId = b.ownerId;
    }
    if (z.hp <= 0) {
      this.zombies.delete(z.id);
      this.grantXp(b.ownerId, ZOMBIE_KILL_XP);
      return true;
    }
    return false;
  }

  /** Bullets vs zombies, and zombies vs players. Kills grant XP to the bullet owner. */
  private resolveCollisions(): void {
    const now = Date.now();

    for (const b of this.bullets.values()) {
      for (const z of this.zombies.values()) {
        if (dist(b.x, b.y, z.x, z.y) >= BULLET_RADIUS + ZOMBIE_RADIUS) continue;

        if (b.explosive) {
          // Explosive splash: damages every zombie within blast radius of
          // the bullet's current position (not just the one that triggered
          // it), with linear falloff — matches explodeBullet() exactly
          // (src/systems/update.ts). Zombie armor/vulnerability fields
          // don't exist server-side (single generic zombie type), so those
          // reduction terms simplify away entirely, consistent with the
          // existing simplified zombie model elsewhere in this server.
          const blastRadius = (b.explodeRadius || 90) + ZOMBIE_RADIUS;
          for (const bz of this.zombies.values()) {
            const d = dist(b.x, b.y, bz.x, bz.y);
            if (d >= blastRadius) continue;
            const falloff = 1 - (d / blastRadius) * 0.4;
            this.applyBulletHit(b, bz, b.damage * falloff);
          }
        } else {
          this.applyBulletHit(b, z, b.damage);
        }
        this.bullets.delete(b.id);
        break; // this bullet is spent, stop checking it against other zombies
      }
    }

    // Blood Moon's 1.3x multiplier applies ONLY to zombie-vs-player damage
    // in solo (baked into the zombie's own `damage` field at spawn time,
    // per src/systems/wave.ts's spawnZombie()) - NOT to zombie-vs-structure
    // damage below, which solo computes from a flat per-zombie-type rate
    // completely independent of that multiplier (src/systems/update.ts).
    const playerDmg = this.bloodMoonActive ? Math.round(ZOMBIE_DAMAGE * BLOOD_MOON_HP_DMG_MULTIPLIER) : ZOMBIE_DAMAGE;
    for (const z of this.zombies.values()) {
      if (now - z.lastHitPlayerAt < ZOMBIE_HIT_COOLDOWN_MS) continue;
      for (const p of this.players.values()) {
        if (!p.alive) continue;
        if (dist(z.x, z.y, p.x, p.y) < ZOMBIE_RADIUS + p.radius) {
          p.hp = Math.max(0, p.hp - playerDmg);
          z.lastHitPlayerAt = now;
          if (p.hp === 0) p.alive = false;
          break; // one hit per zombie per cooldown window
        }
      }
    }

    // Zombie-vs-structure: same flat-damage/cooldown shape as zombie-vs-player
    // above, reusing ZOMBIE_DAMAGE/ZOMBIE_HIT_COOLDOWN_MS rather than adding
    // new constants (roughly matches the client's solo-mode ~14/sec melee
    // rate over a 600ms window). Actual removal happens in tickStructures()'s
    // existing hp<=0 cleanup, which runs right after this in the same tick.
    // Deliberately NOT Blood-Moon-multiplied - see comment above.
    for (const z of this.zombies.values()) {
      if (now - z.lastHitStructureAt < ZOMBIE_HIT_COOLDOWN_MS) continue;
      for (const s of this.structures.values()) {
        const reach = STRUCTURE_DEFS[s.type].radius + ZOMBIE_RADIUS;
        if (dist(z.x, z.y, s.x, s.y) < reach) {
          s.hp -= ZOMBIE_DAMAGE;
          z.lastHitStructureAt = now;
          break; // one hit per zombie per cooldown window
        }
      }
    }
  }

  /** Pyromaniac burn DoT — matches the client's per-frame burn tick
   *  (src/systems/update.ts) but applied once per server tick instead of
   *  once per rendered frame; bypasses armor entirely (straight hp
   *  subtraction), same as solo. Kills grant XP to whoever's bullet applied
   *  the burn tag (burnOwnerId), matching solo's implicit "the shooter gets
   *  credit" behavior rather than dropping XP for burn kills. */
  private tickBurns(): void {
    const now = Date.now();
    for (const z of this.zombies.values()) {
      if (!z.burnUntil || now >= z.burnUntil) continue;
      const burnDmg = (z.burnDamagePerSec || 0) * (TICK_MS / 1000);
      z.hp -= burnDmg;
      if (z.hp <= 0) {
        this.zombies.delete(z.id);
        if (z.burnOwnerId) this.grantXp(z.burnOwnerId, ZOMBIE_KILL_XP);
      }
    }
  }

  private grantXp(playerId: string, amount: number): void {
    const p = this.players.get(playerId);
    if (!p || !p.alive) return;
    p.xp += amount;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level += 1;
      // 1.32 matches the client's gainXp() exactly (src/systems/combat.ts) —
      // was 1.3 here, a pre-existing typo that made synced players level up
      // at slightly different total XP thresholds than solo.
      p.xpToNext = Math.floor(p.xpToNext * 1.32);
      p.maxHp += 8;
      p.hp = Math.min(p.maxHp, p.hp + 8);
    }
  }

  /**
   * Phase 1 structure combat: flat per-level/tier damage against the
   * nearest zombie in range, no special mechanics (splash, chain lightning,
   * slow, toxic clouds, crit/execute thresholds, ramp-up — all deliberately
   * deferred, see protocol.ts's Structure stats section header). No
   * traveling bullet entities either — damage applies directly on cooldown,
   * same as how `sniper` already conceptually works client-side.
   */
  private tickStructures(): void {
    const now = Date.now();

    for (const s of this.structures.values()) {
      if (s.type === 'campfire') {
        for (const p of this.players.values()) {
          if (!p.alive) continue;
          if (dist(s.x, s.y, p.x, p.y) <= CAMPFIRE_HEAL_RADIUS) {
            p.hp = Math.min(p.maxHp, p.hp + CAMPFIRE_HEAL_RATE * (TICK_MS / 1000));
          }
        }
        continue;
      }

      if (s.type === 'spike') {
        const dmg = SPIKE_DAMAGE_BY_TIER[s.tier];
        const reach = STRUCTURE_DEFS.spike.radius + ZOMBIE_RADIUS;
        for (const z of this.zombies.values()) {
          if (dist(s.x, s.y, z.x, z.y) > reach) continue;
          if (now - z.lastSpikeHitAt < SPIKE_HIT_COOLDOWN_MS) continue;
          z.hp -= dmg;
          z.lastSpikeHitAt = now;
          if (z.hp <= 0) this.zombies.delete(z.id);
        }
        continue;
      }

      if (isTowerKind(s.type)) {
        const spec = TOWER_LEVELS[s.type][s.level - 1];
        const cooldownMs = 1000 / spec.fireRate;
        if (now - s.lastShot < cooldownMs) continue;

        let target: ZombieState | null = null;
        let bestDist = Infinity;
        for (const z of this.zombies.values()) {
          const d = dist(s.x, s.y, z.x, z.y);
          if (d <= spec.range && d < bestDist) { bestDist = d; target = z; }
        }
        if (!target) continue;

        s.lastShot = now;
        s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
        target.hp -= spec.damage;
        if (target.hp <= 0) this.zombies.delete(target.id);
        // No XP granted for structure kills — structures have no owner in
        // Phase 1 (see StructureState's doc comment).
      }
    }

    for (const s of this.structures.values()) {
      if (s.hp <= 0) this.structures.delete(s.id);
    }
  }

  private tick(): void {
    this.updateDayNight();
    if (this.zombies.size > 0) this.tickZombiesMovement();
    if (this.bullets.size > 0) this.tickBulletsMovement();
    this.resolveCollisions();
    if (this.zombies.size > 0) this.tickBurns();
    if (this.structures.size > 0) this.tickStructures();

    if (this.sockets.size === 0) return;
    this.broadcastPlayers();
    // Unconditional, like players/bullets/structures below - was previously
    // guarded by `if (this.zombies.size > 0)`, which meant the corrected
    // empty list never got sent when the last zombie died mid-tick, leaving
    // clients showing a stale dead zombie frozen in place until the next
    // spawn's broadcast happened to overwrite it. Harmless when zombies
    // spawned constantly (rare to sit at 0 for long); now that spawning is
    // day/night-gated, zombie count legitimately stays at 0 for the whole
    // day phase, which would otherwise show a corpse frozen on-screen for
    // up to ~55s.
    this.broadcastZombies();
    this.broadcastBullets();
    this.broadcastStructures();
    this.broadcastDayNight();
  }
}
