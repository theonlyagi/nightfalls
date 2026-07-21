import uWS from 'uWebSockets.js';
import {
  WORLD_W, WORLD_H, ROOM_MAX_PLAYERS, ROOM_MIN_PLAYERS, MATCH_START_COUNTDOWN_MS, TICK_MS,
  ZOMBIE_MAX, ZOMBIE_SPAWN_INTERVAL_MS, ZOMBIE_RADIUS, ZOMBIE_DAMAGE, ZOMBIE_HIT_COOLDOWN_MS, ZOMBIE_KILL_XP,
  BULLET_SPEED, BULLET_LIFE_TICKS, BULLET_RADIUS, BULLET_DAMAGE,
  PLAYER_RADIUS, PLAYER_MAX_HP, MAX_PLAYER_SPEED_PER_MS, MIN_SHOT_INTERVAL_MS,
  BUILD_REACH, STRUCTURE_MAX, STRUCTURE_DEFS, TOWER_LEVELS, towerMaxHp,
  WALL_HP_BY_TIER, SPIKE_HP_BY_TIER, SPIKE_DAMAGE_BY_TIER, SPIKE_HIT_COOLDOWN_MS,
  CAMPFIRE_HEAL_RADIUS, CAMPFIRE_HEAL_RATE,
  RoomPhase, StructureKind, TowerKind,
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
}

export interface ZombieState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lastHitPlayerAt: number;
  lastSpikeHitAt: number;
}

export interface BulletState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
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
        id: b.id, ownerId: b.ownerId, x: b.x, y: b.y,
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
    });

    // Bring the new/rejoining client up to date immediately.
    ws.send(JSON.stringify({ type: 'players', players: Array.from(this.players.values()) }));
    ws.send(JSON.stringify({ type: 'zombies', zombies: Array.from(this.zombies.values()) }));
    ws.send(JSON.stringify({ type: 'bullets', bullets: Array.from(this.bullets.values()) }));
    ws.send(JSON.stringify({ type: 'structures', structures: Array.from(this.structures.values()) }));

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

    p.x = clamp(x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
    p.y = clamp(y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);
    p.angle = angle;
    p.lastMoveAt = now;
    p.lastMoveX = p.x;
    p.lastMoveY = p.y;
    this.broadcastPlayers();
  }

  /** Validated shoot: rate-limited, ignored for dead players. */
  handleShoot(id: string, angle: number): void {
    if (this.phase !== 'active') return;
    const p = this.players.get(id);
    if (!p || !p.alive) return;

    const now = Date.now();
    if (now - p.lastShotAt < MIN_SHOT_INTERVAL_MS) return;
    p.lastShotAt = now;

    const bid = generateBulletId();
    this.bullets.set(bid, {
      id: bid, ownerId: id,
      x: p.x, y: p.y,
      vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED,
      life: BULLET_LIFE_TICKS,
    });
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
    this.zombieSpawnTimer = setInterval(() => this.maybeSpawnZombie(), ZOMBIE_SPAWN_INTERVAL_MS);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.broadcastLobby();
  }

  private maybeSpawnZombie(): void {
    if (this.zombies.size >= ZOMBIE_MAX) return;
    const id = generateZombieId();
    this.zombies.set(id, {
      id,
      x: Math.random() * WORLD_W,
      y: Math.random() * WORLD_H,
      hp: 30, maxHp: 30,
      lastHitPlayerAt: 0,
      lastSpikeHitAt: 0,
    });
  }

  private tickZombiesMovement(): void {
    for (const z of this.zombies.values()) {
      z.x = clamp(z.x + (Math.random() - 0.5) * 20, 0, WORLD_W);
      z.y = clamp(z.y + (Math.random() - 0.5) * 20, 0, WORLD_H);
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

  /** Bullets vs zombies, and zombies vs players. Kills grant XP to the bullet owner. */
  private resolveCollisions(): void {
    const now = Date.now();

    for (const b of this.bullets.values()) {
      for (const z of this.zombies.values()) {
        if (dist(b.x, b.y, z.x, z.y) < BULLET_RADIUS + ZOMBIE_RADIUS) {
          z.hp -= BULLET_DAMAGE;
          this.bullets.delete(b.id);
          if (z.hp <= 0) {
            this.zombies.delete(z.id);
            this.grantXp(b.ownerId, ZOMBIE_KILL_XP);
          }
          break; // this bullet is spent, stop checking it against other zombies
        }
      }
    }

    for (const z of this.zombies.values()) {
      if (now - z.lastHitPlayerAt < ZOMBIE_HIT_COOLDOWN_MS) continue;
      for (const p of this.players.values()) {
        if (!p.alive) continue;
        if (dist(z.x, z.y, p.x, p.y) < ZOMBIE_RADIUS + PLAYER_RADIUS) {
          p.hp = Math.max(0, p.hp - ZOMBIE_DAMAGE);
          z.lastHitPlayerAt = now;
          if (p.hp === 0) p.alive = false;
          break; // one hit per zombie per cooldown window
        }
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
      p.xpToNext = Math.floor(p.xpToNext * 1.3);
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
    if (this.zombies.size > 0) this.tickZombiesMovement();
    if (this.bullets.size > 0) this.tickBulletsMovement();
    this.resolveCollisions();
    if (this.structures.size > 0) this.tickStructures();

    if (this.sockets.size === 0) return;
    this.broadcastPlayers();
    if (this.zombies.size > 0) this.broadcastZombies();
    this.broadcastBullets();
    this.broadcastStructures();
  }
}
