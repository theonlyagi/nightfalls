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
  net, sendMove, sendShoot, sendBuild, sendUpgrade, getMyId,
  NetZombieSnapshot, NetBulletSnapshot, NetStructureSnapshot,
} from './socket';
import {
  setInNetMatch, setRemotePlayers, RemotePlayer,
  setZombies, setBullets, setStructures, player,
  inspectedStructure, setInspectedStructure,
} from '../state';
import { Zombie, Bullet, Structure, HairKind, MouthKind } from '../types';
import { SKIN_VARIANTS, BUILD_DEFS } from '../constants';

/** Small deterministic hash so a given entity id always gets the same
 *  cosmetic look across snapshots, instead of re-randomizing every update. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const HAIR_KINDS: HairKind[] = ['bald', 'hood', 'tuft'];
const MOUTH_KINDS: MouthKind[] = ['open', 'frown', 'grimace'];

function toClientZombie(snap: NetZombieSnapshot): Zombie {
  const h = hashId(snap.id);
  const variant = SKIN_VARIANTS[h % SKIN_VARIANTS.length];
  return {
    id: h,
    type: 'normal',
    x: snap.x, y: snap.y, radius: 20,
    hp: snap.hp, maxHp: snap.maxHp, speed: 0, damage: 0, armor: 0,
    hitCooldown: 0, wobble: (h % 628) / 100, flash: 0, lastShot: 0, fuseStart: null,
    hairKind: HAIR_KINDS[h % HAIR_KINDS.length], mouthKind: MOUTH_KINDS[(h >> 3) % MOUTH_KINDS.length],
    squishX: 1, squishY: 1,
    skinColor: variant[0], skinColor2: variant[1], skinDark: variant[2], clothColor: null,
  };
}

/** Tracks each bullet's previous position so we can derive a rough velocity
 *  for the trail render (server snapshots carry position only, not vx/vy). */
const lastBulletPos = new Map<string, { x: number; y: number }>();

function toClientBullet(snap: NetBulletSnapshot): Bullet {
  const prev = lastBulletPos.get(snap.id);
  const vx = prev ? snap.x - prev.x : 0;
  const vy = prev ? snap.y - prev.y : 0;
  lastBulletPos.set(snap.id, { x: snap.x, y: snap.y });
  return {
    x: snap.x, y: snap.y, vx, vy, radius: 5, damage: 0, life: 1,
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
    const others: RemotePlayer[] = msg.players
      .filter(p => p.id !== myId)
      .map(p => ({ id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle, hp: p.hp, maxHp: p.maxHp, alive: p.alive }));
    setRemotePlayers(others);

    // The server is authoritative for the local player's HP/alive too, once
    // a match is active — zombie damage/kills happen server-side.
    const mine = msg.players.find(p => p.id === myId);
    if (mine) {
      player.hp = mine.hp;
      player.maxHp = mine.maxHp;
      player.alive = mine.alive;
    }
  };

  net.onZombies = (msg) => {
    setZombies(msg.zombies.map(toClientZombie));
  };

  net.onBullets = (msg) => {
    const activeIds = new Set(msg.bullets.map(b => b.id));
    for (const id of lastBulletPos.keys()) {
      if (!activeIds.has(id)) lastBulletPos.delete(id);
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
}

export function stopNetMatch(): void {
  setInNetMatch(false);
  setRemotePlayers([]);
  lastBulletPos.clear();
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

export { sendShoot as sendNetShoot, sendBuild as sendNetBuild, sendUpgrade as sendNetUpgrade };
