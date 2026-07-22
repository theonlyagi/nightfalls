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
  net, sendMove, sendShoot, sendBuild, sendUpgrade, sendRemove, getMyId,
  NetZombieSnapshot, NetBulletSnapshot, NetStructureSnapshot,
} from './socket';
import {
  setInNetMatch, setRemotePlayers, RemotePlayer,
  setZombies, setBullets, setStructures, player, zombies, bullets, remotePlayers,
  inspectedStructure, setInspectedStructure,
} from '../state';
import { Zombie, Bullet, Structure, HairKind, MouthKind } from '../types';
import { SKIN_VARIANTS, BUILD_DEFS } from '../constants';
import { dist } from '../utils';

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
interface VecAngle { x: number; y: number; angle: number; }
const zombieRenderPos = new Map<number, Vec>();
const zombieTargetPos = new Map<number, Vec>();
const bulletRenderPos = new Map<string, Vec>();
const bulletTargetPos = new Map<string, Vec>();
const remotePlayerRenderPos = new Map<string, VecAngle>();
const remotePlayerTargetPos = new Map<string, VecAngle>();

/** Time constant for the easing — small enough to stay visually tight to the
 *  true server position, large enough to fully smooth out a tick's worth of
 *  gap between snapshots. Server ticks at ~33ms (server/src/protocol.ts's
 *  TICK_MS) — tuned proportionally down from 90 (which matched the old
 *  100ms tick) so smoothing doesn't lag noticeably behind the now-more-
 *  frequent real updates. */
const NET_SMOOTH_TAU_MS = 30;

function smoothFactor(dtMs: number): number {
  return 1 - Math.exp(-dtMs / NET_SMOOTH_TAU_MS);
}

/** See the reconciliation comment in net.onPlayers below for the full
 *  reasoning — this must stay well above the normal per-send-interval
 *  prediction lag (~10 units) so it only corrects genuine desync. */
const RECONCILE_THRESHOLD = 80;

/** Eases an angle toward a target the short way around the circle (e.g.
 *  350deg -> 10deg turns forward through 360/0, not backward through 180),
 *  instead of a plain numeric lerp which would spin the wrong direction
 *  whenever a snapshot crosses the +-PI wraparound. */
function easeAngle(current: number, target: number, t: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * t;
}

/** Called every frame from the local update loop while inNetMatch — eases
 *  zombies'/bullets'/remote players' rendered x/y (and heading, for players)
 *  toward their latest server position rather than leaving them frozen
 *  between snapshots (which is what produced the "teleport every tick"
 *  choppiness — including other players visibly snapping to a new position
 *  and facing angle every 100ms instead of turning/moving smoothly). */
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
    const target = remotePlayerTargetPos.get(rp.id);
    if (!target) continue;
    rp.x += (target.x - rp.x) * t;
    rp.y += (target.y - rp.y) * t;
    rp.angle = easeAngle(rp.angle, target.angle, t);
    remotePlayerRenderPos.set(rp.id, { x: rp.x, y: rp.y, angle: rp.angle });
  }
}

function toClientZombie(snap: NetZombieSnapshot): Zombie {
  const h = hashId(snap.id);
  const variant = SKIN_VARIANTS[h % SKIN_VARIANTS.length];

  zombieTargetPos.set(h, { x: snap.x, y: snap.y });
  // A brand-new zombie spawns exactly at its true position (no false
  // animate-in from elsewhere); an existing one starts from wherever its
  // per-frame easing last left it, not the raw new snapshot value.
  const render = zombieRenderPos.get(h) ?? { x: snap.x, y: snap.y };
  zombieRenderPos.set(h, render);

  return {
    id: h,
    type: 'normal',
    x: render.x, y: render.y, radius: 20,
    hp: snap.hp, maxHp: snap.maxHp, speed: 0, damage: 0, armor: 0,
    hitCooldown: 0, wobble: (h % 628) / 100, flash: 0, lastShot: 0, fuseStart: null,
    hairKind: HAIR_KINDS[h % HAIR_KINDS.length], mouthKind: MOUTH_KINDS[(h >> 3) % MOUTH_KINDS.length],
    squishX: 1, squishY: 1,
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
    owner: 'player',
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
    const otherSnaps = msg.players.filter(p => p.id !== myId);

    const activeIds = new Set(otherSnaps.map(p => p.id));
    for (const id of remotePlayerRenderPos.keys()) {
      if (!activeIds.has(id)) { remotePlayerRenderPos.delete(id); remotePlayerTargetPos.delete(id); }
    }

    const others: RemotePlayer[] = otherSnaps.map(p => {
      remotePlayerTargetPos.set(p.id, { x: p.x, y: p.y, angle: p.angle });
      // A brand-new player renders exactly at their true position (no false
      // animate-in from elsewhere); an existing one starts from wherever its
      // per-frame easing last left it, not the raw new snapshot value.
      const render = remotePlayerRenderPos.get(p.id) ?? { x: p.x, y: p.y, angle: p.angle };
      remotePlayerRenderPos.set(p.id, render);
      return { id: p.id, name: p.name, x: render.x, y: render.y, angle: render.angle, hp: p.hp, maxHp: p.maxHp, alive: p.alive };
    });
    setRemotePlayers(others);

    // The server is authoritative for the local player's HP/alive too, once
    // a match is active — zombie damage/kills happen server-side.
    const mine = msg.players.find(p => p.id === myId);
    if (mine) {
      player.hp = mine.hp;
      player.maxHp = mine.maxHp;
      player.alive = mine.alive;

      // Reconciliation: the local player's x/y is always client-predicted
      // (moved instantly off local input in updatePlayer(), never gated on
      // the network — see systems/update.ts), so under normal conditions the
      // server's copy of "mine" merely lags behind by about one send
      // interval (moves are sent every ~33ms — see MOVE_SEND_INTERVAL_MS)
      // and this never needs to do anything. It exists only as a safety net:
      // without it, a single move the server ever rejects (e.g. the
      // anti-speed-hack check in Room.ts's handleMove tripping from network
      // jitter) would leave the client silently diverged forever from the
      // position everyone else (other players, zombie targeting/collision)
      // actually sees, with no way to recover. RECONCILE_THRESHOLD is set
      // well above the largest gap normal one-tick send latency can produce
      // (~120 u/s * 33ms =~ 4 units) so it only fires on a real desync, not
      // routine prediction lag.
      const driftDist = dist(player.x, player.y, mine.x, mine.y);
      if (driftDist > RECONCILE_THRESHOLD) {
        console.warn(`[net] reconciling local player position, drifted ${driftDist.toFixed(0)} units from server`);
        player.x = mine.x;
        player.y = mine.y;
      }
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
    const activeIds = new Set(msg.bullets.map(b => b.id));
    for (const id of lastBulletPos.keys()) {
      if (!activeIds.has(id)) lastBulletPos.delete(id);
    }
    for (const id of bulletRenderPos.keys()) {
      if (!activeIds.has(id)) { bulletRenderPos.delete(id); bulletTargetPos.delete(id); }
    }
    setBullets(msg.bullets.map(toClientBullet));
  };

  net.onStructures = (msg) => {
    const next = msg.structures.map(toClientStructure);
    setStructures(next);
    // setStructures swaps in fresh object references every sync, so a
    // previously-inspected structure (held by reference, not id, in
    // state.ts) would otherwise go stale after this tick — frozen HP/level
    // in the inspector panel, and its selection ring (drawWorld.ts's
    // `st === inspectedStructure` check) would stop matching anything.
    if (inspectedStructure) {
      setInspectedStructure(next.find(s => s.id === inspectedStructure!.id) ?? null);
    }
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
  remotePlayerRenderPos.clear();
  remotePlayerTargetPos.clear();
}

export function stopNetMatch(): void {
  setInNetMatch(false);
  setRemotePlayers([]);
  lastBulletPos.clear();
  zombieRenderPos.clear();
  zombieTargetPos.clear();
  bulletRenderPos.clear();
  bulletTargetPos.clear();
  remotePlayerRenderPos.clear();
  remotePlayerTargetPos.clear();
}

let lastSentMoveAt = 0;
/** Matches server/src/protocol.ts's TICK_MS (~33ms/~30Hz) — was 80ms (~12.5Hz,
 *  tuned for the old 100ms server tick), which meant other players only ever
 *  saw your position update at less than half the rate the server could
 *  actually relay it at. */
const MOVE_SEND_INTERVAL_MS = 33;

/** Called from the local update loop every frame while inNetMatch — throttled
 *  so we're not sending 60 packets/sec for a game with a ~33ms server tick. */
export function maybeSendMove(now: number): void {
  if (now - lastSentMoveAt < MOVE_SEND_INTERVAL_MS) return;
  lastSentMoveAt = now;
  sendMove(player.x, player.y, player.angle);
}

export { sendShoot as sendNetShoot, sendBuild as sendNetBuild, sendUpgrade as sendNetUpgrade, sendRemove as sendNetRemove };
