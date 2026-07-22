// ===================== Protocol =====================
// Shared packet shapes and constants for client <-> server communication.
// Bumping PROTOCOL_VERSION is how a future client can detect it's talking to
// a server it no longer matches, instead of silently misbehaving.

export const PROTOCOL_VERSION = 1;

export const WORLD_W = 4200;
export const WORLD_H = 4200;

export const ROOM_MAX_PLAYERS = 4;
export const ROOM_MIN_PLAYERS = 2;

/** How long everyone must stay ready, uninterrupted, before a match actually starts. */
export const MATCH_START_COUNTDOWN_MS = 3000;

export const TICK_MS = 100;

export const ZOMBIE_MAX = 10;
export const ZOMBIE_SPAWN_INTERVAL_MS = 3000;
export const ZOMBIE_RADIUS = 22;
export const ZOMBIE_DAMAGE = 8;
export const ZOMBIE_HIT_COOLDOWN_MS = 600;
export const ZOMBIE_KILL_XP = 10;

/** World units/sec while chasing the nearest alive player. There's no
 *  existing server-side value to match — the client's per-type speedMul
 *  system isn't ported (server has one generic zombie, see the zombie-model
 *  gap in CLAUDE.md) — so this is a fresh constant, picked at ~75% of
 *  measured player movement speed (~120 u/s) so zombies threaten but don't
 *  guarantee a catch. Tune freely. */
export const ZOMBIE_CHASE_SPEED = 90;

export const BULLET_SPEED = 9.5;
export const BULLET_LIFE_TICKS = 60;
export const BULLET_RADIUS = 5;
export const BULLET_DAMAGE = 12;

export const PLAYER_RADIUS = 22;
export const PLAYER_MAX_HP = 100;

/** Generous per-message speed cap: distance implied by two move packets must
 *  not exceed this many world units per millisecond, or the move is dropped
 *  as implausible (basic anti-teleport, not full server-side physics). */
export const MAX_PLAYER_SPEED_PER_MS = 0.6;
export const MIN_SHOT_INTERVAL_MS = 150;

/** How long a disconnected player's state is kept around for a reconnect
 *  before it's discarded for good. */
export const SESSION_GRACE_MS = 30000;

/** How far (world units) a build/upgrade target may be from the sender's
 *  current server-tracked position — mirrors the client's BUILD_REACH
 *  (TILE*3 = 192), basic anti-cheat consistent with the move-speed check. */
export const BUILD_REACH = 192;

/** Generous per-room cap purely as a DoS safety net — resource cost isn't
 *  server-validated yet (see protocol/Room structure notes), so this is
 *  what stops a modified client from spamming free structures, not a
 *  balance mechanic. */
export const STRUCTURE_MAX = 60;

export interface MovePacket {
  type: 'move';
  x: number;
  y: number;
  angle: number;
}

export interface ShootPacket {
  type: 'shoot';
  angle: number;
}

export interface ReadyPacket {
  type: 'ready';
  ready: boolean;
}

export type StructureKind =
  | 'wall' | 'spike' | 'campfire' | 'shop' | 'factory'
  | 'cannon' | 'mortar' | 'sniper' | 'tesla' | 'frost' | 'toxic';

export const STRUCTURE_KINDS: StructureKind[] = [
  'wall', 'spike', 'campfire', 'shop', 'factory',
  'cannon', 'mortar', 'sniper', 'tesla', 'frost', 'toxic',
];

export interface BuildPacket {
  type: 'build';
  kind: StructureKind;
  x: number;
  y: number;
  angle: number;
}

export interface UpgradePacket {
  type: 'upgrade';
  structureId: string;
}

export type ClientPacket = MovePacket | ShootPacket | ReadyPacket | BuildPacket | UpgradePacket;

// ---------------- Structure stats (Phase 1: flat per-level numbers only) ----------------
// Deliberately simplified server-side model — see server/src/Room.ts's
// tickStructures() for the full list of client-side special mechanics
// (chain lightning, splash falloff, crit/execute thresholds, toxic clouds,
// slow/freeze, ramp-up) intentionally NOT ported yet. Values below are
// copied from src/constants.ts's BUILD_DEFS/TOWER_LEVELS/STRUCTURE_TIERS —
// this is a standalone server project (doesn't import from src/), so it
// keeps its own copy, same pattern as WORLD_W/ZOMBIE_RADIUS/etc. above.

export interface StructureBaseDef {
  hp: number;
  radius: number;
}

export const STRUCTURE_DEFS: Record<StructureKind, StructureBaseDef> = {
  wall:     { hp: 80,  radius: 26 },
  spike:    { hp: 40,  radius: 18 },
  campfire: { hp: 50,  radius: 20 },
  shop:     { hp: 120, radius: 24 },
  factory:  { hp: 150, radius: 28 },
  cannon:   { hp: 70,  radius: 20 },
  mortar:   { hp: 80,  radius: 22 },
  sniper:   { hp: 60,  radius: 20 },
  tesla:    { hp: 70,  radius: 20 },
  frost:    { hp: 90,  radius: 22 },
  toxic:    { hp: 80,  radius: 20 },
};

export const CAMPFIRE_HEAL_RADIUS = 150;
export const CAMPFIRE_HEAL_RATE = 5; // hp/sec

export const SPIKE_DAMAGE_BY_TIER = [9, 16, 26];
export const SPIKE_HIT_COOLDOWN_MS = 500;

/** wall/spike maxHp by tier index (0-2). */
export const WALL_HP_BY_TIER = [80, 170, 280];
export const SPIKE_HP_BY_TIER = [40, 65, 95];

export interface TowerLevelSpec {
  damage: number;
  fireRate: number; // shots/sec
  range: number;
}

export type TowerKind = 'cannon' | 'mortar' | 'sniper' | 'tesla' | 'frost' | 'toxic';

export const TOWER_LEVELS: Record<TowerKind, TowerLevelSpec[]> = {
  cannon: [
    { damage: 15, fireRate: 1.0,  range: 250 },
    { damage: 22, fireRate: 1.1,  range: 275 },
    { damage: 32, fireRate: 1.25, range: 300 },
    { damage: 48, fireRate: 1.4,  range: 325 },
    { damage: 75, fireRate: 1.6,  range: 350 },
  ],
  mortar: [
    { damage: 40,  fireRate: 0.4,  range: 400 },
    { damage: 60,  fireRate: 0.45, range: 420 },
    { damage: 90,  fireRate: 0.5,  range: 440 },
    { damage: 135, fireRate: 0.55, range: 460 },
    { damage: 210, fireRate: 0.6,  range: 480 },
  ],
  sniper: [
    { damage: 120, fireRate: 0.25, range: 600 },
    { damage: 180, fireRate: 0.28, range: 650 },
    { damage: 270, fireRate: 0.32, range: 700 },
    { damage: 400, fireRate: 0.35, range: 750 },
    { damage: 650, fireRate: 0.4,  range: 800 },
  ],
  tesla: [
    { damage: 20,  fireRate: 0.8, range: 240 },
    { damage: 30,  fireRate: 0.9, range: 260 },
    { damage: 45,  fireRate: 1.0, range: 280 },
    { damage: 65,  fireRate: 1.1, range: 300 },
    { damage: 100, fireRate: 1.3, range: 320 },
  ],
  frost: [
    { damage: 5,  fireRate: 1.0, range: 200 },
    { damage: 8,  fireRate: 1.0, range: 225 },
    { damage: 13, fireRate: 1.0, range: 250 },
    { damage: 20, fireRate: 1.0, range: 275 },
    { damage: 32, fireRate: 1.0, range: 300 },
  ],
  toxic: [
    { damage: 10, fireRate: 0.25, range: 340 },
    { damage: 16, fireRate: 0.25, range: 360 },
    { damage: 25, fireRate: 0.25, range: 380 },
    { damage: 38, fireRate: 0.25, range: 400 },
    { damage: 58, fireRate: 0.25, range: 420 },
  ],
};

/** Matches the client's upgrade formula exactly (shopUI.ts's tower-upgrade
 *  branch): maxHp scales 1.0/1.5/2.0/2.5/3.0x base across levels 1-5. */
export function towerMaxHp(kind: TowerKind, level: number): number {
  return STRUCTURE_DEFS[kind].hp * (1 + (level - 1) * 0.5);
}

export interface StructureSnapshot {
  id: string;
  type: StructureKind;
  x: number;
  y: number;
  angle: number;
  aimAngle: number;
  tier: number;
  level: number;
  hp: number;
  maxHp: number;
}

export type RoomPhase = 'waiting' | 'countdown' | 'active';

export interface LobbyPlayerSnapshot {
  id: string;
  name: string;
  ready: boolean;
}

export interface LobbySnapshot {
  type: 'lobby';
  phase: RoomPhase;
  players: LobbyPlayerSnapshot[];
  countdownEndsAt: number | null;
}

export interface PlayerSnapshot {
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
}

export interface ZombieSnapshot {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface BulletSnapshot {
  id: string;
  ownerId: string;
  x: number;
  y: number;
}

export function isMovePacket(value: any): value is MovePacket {
  return (
    value &&
    value.type === 'move' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.angle)
  );
}

export function isShootPacket(value: any): value is ShootPacket {
  return value && value.type === 'shoot' && Number.isFinite(value.angle);
}

export function isReadyPacket(value: any): value is ReadyPacket {
  return value && value.type === 'ready' && typeof value.ready === 'boolean';
}

export function isBuildPacket(value: any): value is BuildPacket {
  return (
    value &&
    value.type === 'build' &&
    typeof value.kind === 'string' &&
    STRUCTURE_KINDS.includes(value.kind) &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.angle)
  );
}

export function isUpgradePacket(value: any): value is UpgradePacket {
  return value && value.type === 'upgrade' && typeof value.structureId === 'string';
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
