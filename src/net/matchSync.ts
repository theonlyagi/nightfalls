// ===================== In-match server sync =====================
// Bridges the WebSocket client (socket.ts) into actual gameplay state once a
// match is active. Solo play never touches any of this — inNetMatch stays
// false and every system runs exactly as it always has.
//
// Known simplification (documented, not accidental): the server's zombie
// model doesn't have types/stats yet (see server/src/Room.ts) — it's one
// generic wandering zombie archetype. Synced zombies render as the 'normal'
// type client-side until the server gains full type parity (wolf packs,
// spider, witch, ranged/explode behavior) — that's flagged as follow-up
// work, not forgotten.

import {
  net, sendMove, sendShoot, sendBuild, sendUpgrade, sendRemove, sendWeaponChoice, sendMutationChoice, getMyId,
  NetZombieSnapshot, NetBulletSnapshot, NetStructureSnapshot,
} from './socket';
import {
  setInNetMatch, setRemotePlayers, RemotePlayer, remotePlayers,
  setZombies, setBullets, setStructures, setResources, player, zombies, bullets,
  inspectedStructure, setInspectedStructure, dayNight, bloodMoon,
} from '../state';
import { Zombie, Bullet, Structure, HairKind, MouthKind, WeaponKind } from '../types';
import { SKIN_VARIANTS, BUILD_DEFS, WEAPON_DEFS } from '../constants';
import { showBanner } from '../systems/combat';
import { applyPhaseLabel, fireDayNightTransitionBanner } from '../systems/wave';

/** Small deterministic hash so a given entity id always gets the same
 *  cosmetic look across snapshots, instead of re-randomizing every update. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const HAIR_KINDS: HairKind[] = ['bald', 'hood', 'tuft'];
const MOUTH_KINDS: MouthKind[] = ['open', 'frown', 'grimace'];

// ---------------- Position interpolation (zombies + bullets) ----------------
// Server snapshots arrive ~every 100ms; setZombies/setBullets used to snap
// straight to each snapshot's x/y, so entities visibly teleported every tick
// instead of moving smoothly. Fix: every frame, ease the rendered position
// toward the latest known server position (exponential smoothing) instead of
// jumping to it, and carry the *rendered* (not raw snapshot) position over
// into the next snapshot-rebuilt object so the easing has continuity across
// setZombies/setBullets swapping in fresh object references each time.
interface Vec { x: number; y: number; }
interface RemotePos { x: number; y: number; angle: number; weapon?: WeaponKind; }

const zombieRenderPos = new Map<number, Vec>();
const zombieTargetPos = new Map<number, Vec>();
const bulletRenderPos = new Map<string, Vec>();
const bulletTargetPos = new Map<string, Vec>();

const remoteRenderPos = new Map<string, RemotePos>();
const remoteTargetPos = new Map<string, RemotePos>();

/** Shortest path angle lerp to prevent spinning artifacts across -PI/PI boundaries. */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

/** Time constant for the easing — small enough to stay visually tight to the
 *  true server position, large enough to fully smooth out a 100ms-tick jump. */
const NET_SMOOTH_TAU_MS = 90;

function smoothFactor(dtMs: number): number {
  return 1 - Math.exp(-dtMs / NET_SMOOTH_TAU_MS);
}

/** Called every frame from the local update loop while inNetMatch — eases
 *  zombies'/bullets'/remote players' rendered x/y/angle toward their latest server position
 *  rather than leaving them frozen between snapshots (which is what produced the
 *  "teleport every tick" choppiness). */
export function updateNetInterpolation(dt: number): void {
  const t = smoothFactor(dt);

  for (const z of zombies) {
    const target = zombieTargetPos.get(z.id);
    if (!target) continue;
    z.x += (target.x - z.x) * t;
    z.y += (target.y - z.y) * t;
    zombieRenderPos.set(z.id, { x: z.x, y: z.y });
  }

  for (const b of bullets) {
    if (!b.id) continue;
    const target = bulletTargetPos.get(b.id);
    if (!target) continue;
    b.x += (target.x - b.x) * t;
    b.y += (target.y - b.y) * t;
    bulletRenderPos.set(b.id, { x: b.x, y: b.y });
  }

  for (const rp of remotePlayers) {
    const target = remoteTargetPos.get(rp.id);
    if (!target) continue;
    const rx = (rp.renderX ?? rp.x) + (target.x - (rp.renderX ?? rp.x)) * t;
    const ry = (rp.renderY ?? rp.y) + (target.y - (rp.renderY ?? rp.y)) * t;
    const rAngle = lerpAngle(rp.renderAngle ?? rp.angle, target.angle, t);

    rp.renderX = rx;
    rp.renderY = ry;
    rp.renderAngle = rAngle;
    rp.angle = rAngle;
    remoteRenderPos.set(rp.id, { x: rx, y: ry, angle: rAngle, weapon: target.weapon });
  }
}

function toClientZombie(snap: NetZombieSnapshot): Zombie {
  const h = hashId(snap.id);
  const variant = SKIN_VARIANTS[h % SKIN_VARIANTS.length];

  zombieTargetPos.set(h, { x: snap.x, y: snap.y });
  const render = zombieRenderPos.get(h) ?? { x: snap.x, y: snap.y };
  zombieRenderPos.set(h, render);

  const existing = zombies.find(z => z.id === h);
  let curHp = snap.hp;
  let curMaxHp = snap.maxHp;

  if (existing) {
    // Only update HP if damaged (snap.hp < existing.hp) or during flash hit state
    if (snap.hp < existing.hp || existing.flash > 0) {
      curHp = snap.hp;
    } else {
      curHp = existing.hp;
    }
    curMaxHp = existing.maxHp || snap.maxHp;
  }

  return {
    id: h,
    type: snap.zombieType || existing?.type || 'normal',
    x: render.x, y: render.y, radius: existing?.radius || 20,
    hp: curHp, maxHp: curMaxHp, speed: 0, damage: 0, armor: 0,
    hitCooldown: existing?.hitCooldown || 0,
    wobble: existing?.wobble ?? ((h % 628) / 100),
    flash: existing?.flash || 0,
    lastShot: existing?.lastShot || 0,
    fuseStart: existing?.fuseStart || null,
    hairKind: existing?.hairKind || HAIR_KINDS[h % HAIR_KINDS.length],
    mouthKind: existing?.mouthKind || MOUTH_KINDS[(h >> 3) % MOUTH_KINDS.length],
    squishX: existing?.squishX || 1, squishY: existing?.squishY || 1,
    skinColor: variant[0], skinColor2: variant[1], skinDark: variant[2], clothColor: null,
  };
}

/** Tracks each bullet's previous position so we can derive a rough velocity
 *  for the trail render (server snapshots carry position only, not vx/vy).
 *  Purely cosmetic (trail direction/length) — separate from the
 *  render/target position maps above, which drive actual displayed motion. */
const lastBulletPos = new Map<string, { x: number; y: number }>();

function toClientBullet(snap: NetBulletSnapshot): Bullet {
  const prev = lastBulletPos.get(snap.id);
  const vx = prev ? snap.x - prev.x : 0;
  const vy = prev ? snap.y - prev.y : 0;
  lastBulletPos.set(snap.id, { x: snap.x, y: snap.y });

  bulletTargetPos.set(snap.id, { x: snap.x, y: snap.y });
  const render = bulletRenderPos.get(snap.id) ?? { x: snap.x, y: snap.y };
  bulletRenderPos.set(snap.id, render);

  return {
    id: snap.id,
    x: render.x, y: render.y, vx, vy, radius: 5, damage: 0, life: 1,
    owner: 'remotePlayer' as any,
  };
}

/** Unlike zombies/bullets, structures need no cosmetic derivation — every
 *  field drawStructure() reads (type/x/y/angle/aimAngle/tier/level/hp/maxHp)
 *  comes straight off the snapshot; `radius` is a pure per-type constant
 *  lookup (never varies by level, confirmed against BUILD_DEFS/TOWER_LEVELS). */
function toClientStructure(snap: NetStructureSnapshot): Structure {
  return {
    id: snap.id,
    type: snap.type, x: snap.x, y: snap.y, angle: snap.angle, aimAngle: snap.aimAngle,
    radius: BUILD_DEFS[snap.type].radius,
    hp: snap.hp, maxHp: snap.maxHp,
    tier: snap.tier, level: snap.level,
  };
}

let wired = false;

/** Registers the server -> game-state callbacks. Safe to call once at startup;
 *  the callbacks themselves check inNetMatch-relevant state as needed. */
export function initMatchSync(): void {
  if (wired) return;
  wired = true;

  net.onPlayers = (msg) => {
    const myId = getMyId();
    const activeIds = new Set(msg.players.map(p => p.id));
    for (const id of remoteRenderPos.keys()) {
      if (!activeIds.has(id)) {
        remoteRenderPos.delete(id);
        remoteTargetPos.delete(id);
      }
    }

    const others: RemotePlayer[] = msg.players
      .filter(p => p.id !== myId)
      .map(p => {
        const weapon = ((p as any).weapon as WeaponKind) || 'pistol';
        remoteTargetPos.set(p.id, { x: p.x, y: p.y, angle: p.angle, weapon });
        const render = remoteRenderPos.get(p.id) ?? { x: p.x, y: p.y, angle: p.angle, weapon };
        remoteRenderPos.set(p.id, render);

        return {
          id: p.id,
          name: p.name,
          x: p.x,
          y: p.y,
          angle: p.angle,
          hp: p.hp,
          maxHp: p.maxHp,
          alive: p.alive,
          weapon,
          renderX: render.x,
          renderY: render.y,
          renderAngle: render.angle,
          targetX: p.x,
          targetY: p.y,
          targetAngle: p.angle,
        };
      });
    setRemotePlayers(others);

    // The server is authoritative for the local player's HP/alive too, once
    // a match is active — zombie damage/kills happen server-side.
    const mine = msg.players.find(p => p.id === myId);
    if (mine) {
      player.maxHp = mine.maxHp;
      player.alive = mine.alive;
      player.hp = mine.hp;
    }
  };

  net.onZombies = (msg) => {
    const activeIds = new Set(msg.zombies.map(z => hashId(z.id)));
    for (const id of zombieRenderPos.keys()) {
      if (!activeIds.has(id)) { zombieRenderPos.delete(id); zombieTargetPos.delete(id); }
    }
    setZombies(msg.zombies.map(toClientZombie));
  };

  net.onBullets = (msg) => {
    const myId = getMyId();
    const activeIds = new Set(msg.bullets.map(b => b.id));
    for (const id of lastBulletPos.keys()) {
      if (!activeIds.has(id)) lastBulletPos.delete(id);
    }
    for (const id of bulletRenderPos.keys()) {
      if (!activeIds.has(id)) { bulletRenderPos.delete(id); bulletTargetPos.delete(id); }
    }

    const localBullets = bullets.filter(b => (b.owner === 'player' || (b.owner as any) === 'remotePlayer') && b.life > 0 && !b.dead);
    const remoteServerBullets = msg.bullets.filter(b => b.ownerId !== myId).map(toClientBullet);
    setBullets([...localBullets, ...remoteServerBullets]);
  };

  net.onStructures = (msg) => {
    const next = msg.structures.map(toClientStructure);
    setStructures(next);
    if (inspectedStructure) {
      setInspectedStructure(next.find(s => s.id === inspectedStructure!.id) ?? null);
    }
  };

  net.onResources = (msg) => {
    setResources(msg.resources.map(r => ({
      id: r.id,
      type: r.type,
      x: r.x,
      y: r.y,
      radius: r.radius,
      hp: r.hp,
      maxHp: r.maxHp,
    })));
  };

  net.onShoot = (msg) => {
    const myId = getMyId();
    if (msg.shooterId === myId) return;

    const shooter = remotePlayers.find(p => p.id === msg.shooterId);
    const shooterX = msg.x ?? (shooter?.renderX ?? shooter?.x ?? 0);
    const shooterY = msg.y ?? (shooter?.renderY ?? shooter?.y ?? 0);
    const weapon = msg.weapon || shooter?.weapon || 'pistol';
    const angle = msg.angle;
    const wdef = WEAPON_DEFS[weapon] || WEAPON_DEFS.pistol;

    const dmg = 12 * wdef.damageMul;
    const speed = 9.5 * (wdef.bulletSpeedMul || 1);
    const life = 4000 * (wdef.bulletLifeMul || 1);

    function spawnBullet(a: number, originOffset: number): void {
      const perpX = Math.cos(a + Math.PI / 2), perpY = Math.sin(a + Math.PI / 2);
      const b: Bullet = {
        x: shooterX + Math.cos(a) * 54 + perpX * originOffset,
        y: shooterY + Math.sin(a) * 54 + perpY * originOffset,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 5,
        damage: dmg,
        life,
        owner: 'remotePlayer' as any,
      };
      if (wdef.explosive) { b.explosive = true; b.explodeRadius = wdef.explodeRadius; }
      bullets.push(b);
    }

    if (weapon === 'dualguns') {
      spawnBullet(angle, -9);
      spawnBullet(angle, 9);
    } else if (weapon === 'shotgun') {
      const spread = wdef.spreadRad || 0.22;
      spawnBullet(angle - spread, 0);
      spawnBullet(angle, 0);
      spawnBullet(angle + spread, 0);
    } else {
      spawnBullet(angle, 0);
    }
  };

  net.onDayNight = (msg) => {
    if (Number.isFinite(msg.time)) {
      const diff = Math.abs(dayNight.time - msg.time);
      if (diff > 400 && diff < 100000) {
        dayNight.time = msg.time;
      }
    }
    dayNight.nightCount = msg.nightCount || 0;
    bloodMoon.active = !!msg.bloodMoon;

    // factor is a pure function of time (same cosine ease src/systems/wave.ts's
    // solo updateDayNight() uses) - derived here rather than sent over the
    // wire separately, so the server only needs to broadcast one extra field
    // (isNight) to make the client server-authoritative for day/night.
    const frac = (dayNight.time % dayNight.total) / dayNight.total;
    dayNight.factor = (1 - Math.cos(frac * Math.PI * 2)) / 2;

    // wasNight is read before overwriting dayNight.isNight, same pattern
    // solo's updateDayNight() already uses - fireDayNightTransitionBanner
    // only acts when isNight actually flips, so this is safe to call on
    // every incoming message without re-firing the banner each tick.
    const wasNight = dayNight.isNight;
    dayNight.isNight = !!msg.isNight;
    fireDayNightTransitionBanner(wasNight);
    applyPhaseLabel();
  };

  net.onGameOver = () => {
    showBanner('TEAM ELIMINATED', 'All survivors have fallen! Returning to lobby...', 'boss');
    setTimeout(() => {
      stopNetMatch();
      const menu = document.getElementById('mainMenu');
      if (menu) menu.classList.add('show');
    }, 3500);
  };

  net.onDisconnected = () => {
    setInNetMatch(false);
  };
}

/** Called once the lobby countdown completes and the match actually starts. */
export function startNetMatch(): void {
  setInNetMatch(true);
  lastBulletPos.clear();
  zombieRenderPos.clear();
  zombieTargetPos.clear();
  bulletRenderPos.clear();
  bulletTargetPos.clear();
  remoteRenderPos.clear();
  remoteTargetPos.clear();
}

export function stopNetMatch(): void {
  setInNetMatch(false);
  setRemotePlayers([]);
  lastBulletPos.clear();
  zombieRenderPos.clear();
  zombieTargetPos.clear();
  bulletRenderPos.clear();
  bulletTargetPos.clear();
  remoteRenderPos.clear();
  remoteTargetPos.clear();
}

let lastSentMoveAt = 0;
const MOVE_SEND_INTERVAL_MS = 80;

/** Called from the local update loop every frame while inNetMatch — throttled
 *  so we're not sending 60 packets/sec for a game with a 100ms server tick. */
export function maybeSendMove(now: number): void {
  if (now - lastSentMoveAt < MOVE_SEND_INTERVAL_MS) return;
  lastSentMoveAt = now;
  sendMove(player.x, player.y, player.angle);
}

export {
  sendShoot as sendNetShoot, sendBuild as sendNetBuild, sendUpgrade as sendNetUpgrade, sendRemove as sendNetRemove,
  sendWeaponChoice as sendNetWeaponChoice, sendMutationChoice as sendNetMutationChoice
};
