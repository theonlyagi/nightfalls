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

/** ~30 ticks/sec. Was 100 (10 TPS) - low enough to look choppy even with
 *  client-side interpolation smoothing over the gaps, since hit detection,
 *  zombie movement, and structure combat are all only as fresh as the last
 *  tick. Room counts are small (max 4 players) so the extra broadcast/CPU
 *  cost of ~3x the tick rate is modest. */
export const TICK_MS = 33;

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

/** World units/sec. Matches the client's effective solo-mode bullet speed
 *  (BASE_STATS.bulletSpeed=9.5 applied per rendered frame at ~60fps, i.e.
 *  9.5*60). The server ticks at TICK_MS not 60fps, so callers must scale
 *  this by (TICK_MS/1000) to get the correct per-tick displacement — same
 *  pattern as ZOMBIE_CHASE_SPEED below. Previously this constant held the
 *  raw per-frame value (9.5) and was applied directly as a per-tick
 *  displacement, making multiplayer bullets ~6x slower than intended. */
export const BULLET_SPEED_PER_SEC = 9.5 * 60;
/** Real-time base duration a bullet lives for (before any per-weapon
 *  bulletLifeMul), independent of tick rate. Matches the client's solo-mode
 *  base bullet life exactly (src/systems/combat.ts's tryShoot():
 *  `life = 1400 * (wdef.bulletLifeMul||1)`) — was 6000 here, a pre-existing
 *  bug unrelated to tick rate that gave the plain pistol bullet ~4.3x solo's
 *  actual range; fixed while this exact code path is being made weapon-
 *  aware anyway. Room.ts's handleShoot() derives the actual per-shot tick
 *  count from this (scaled by wdef.bulletLifeMul and TICK_MS) so tuning
 *  TICK_MS again in the future can't accidentally change bullet range. */
export const BULLET_LIFE_MS = 1400;
export const BULLET_RADIUS = 5;
export const BULLET_DAMAGE = 12;

export const PLAYER_RADIUS = 22;
export const PLAYER_MAX_HP = 100;

/** Generous per-message speed cap: distance implied by two move packets must
 *  not exceed this many world units per millisecond, or the move is dropped
 *  as implausible (basic anti-teleport, not full server-side physics). */
export const MAX_PLAYER_SPEED_PER_MS = 0.6;
// MIN_SHOT_INTERVAL_MS (flat 150ms) removed - superseded by the per-weapon+
// mutation minimum interval computed in Room.ts's handleShoot() (see
// WEAPON_DEFS/BASE_FIRE_RATE/OVERCLOCKED_FIRE_RATE_MUL below). The flat
// value would have mis-throttled two real combos that fire faster than
// 150ms apart even in solo mode: machinegun+overclocked (~90ms) and
// dualguns+overclocked (~139ms).

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

/** Mirrors src/types.ts's WeaponKind. 'pistol' is the default starting
 *  weapon, not a choosable unlock (matches the client's shopUI.ts filtering
 *  it out of the choice list) - isWeaponChoicePacket rejects it below. */
export type WeaponKind = 'pistol' | 'dualguns' | 'machinegun' | 'shotgun' | 'grenadelauncher';
export const WEAPON_KINDS: WeaponKind[] = ['pistol', 'dualguns', 'machinegun', 'shotgun', 'grenadelauncher'];

/** Mirrors src/types.ts's MutationKind. */
export type MutationKind = 'vampire' | 'overclocked' | 'titan' | 'pyromaniac';
export const MUTATION_KINDS: MutationKind[] = ['vampire', 'overclocked', 'titan', 'pyromaniac'];

export interface WeaponChoicePacket {
  type: 'weaponChoice';
  weapon: WeaponKind;
}

export interface MutationChoicePacket {
  type: 'mutationChoice';
  mutation: MutationKind;
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

export interface RemovePacket {
  type: 'remove';
  structureId: string;
}

export type ClientPacket =
  | MovePacket | ShootPacket | ReadyPacket | BuildPacket | UpgradePacket | RemovePacket
  | WeaponChoicePacket | MutationChoicePacket;

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

// ---------------- Weapon + mutation stats ----------------
// Copied from src/constants.ts's WEAPON_DEFS/MUTATION_DEFS - same
// standalone-project "own copy" pattern as STRUCTURE_DEFS/TOWER_LEVELS
// above. Multi-pellet weapons (dualguns/shotgun) are spawned by hardcoded
// weapon-name branching in Room.ts's handleShoot(), matching the client's
// tryShoot() exactly (it does the same - the `pellets` field below exists
// only for parity with the client's WeaponDef shape and is unused, just
// like it's unused client-side).

export interface WeaponDef {
  fireRateMul: number;
  damageMul: number;
  pellets?: number;
  spreadRad?: number;
  explosive?: boolean;
  explodeRadius?: number;
  bulletSpeedMul?: number;
  bulletLifeMul?: number;
}

export const WEAPON_DEFS: Record<WeaponKind, WeaponDef> = {
  pistol:          { fireRateMul: 1,    damageMul: 1 },
  dualguns:        { fireRateMul: 1.5,  damageMul: 0.65, pellets: 2 },
  machinegun:      { fireRateMul: 2.3,  damageMul: 0.9 },
  shotgun:         { fireRateMul: 1,    damageMul: 0.65, pellets: 3, spreadRad: 0.22, bulletLifeMul: 0.55 },
  grenadelauncher: { fireRateMul: 0.35, damageMul: 2.6,  explosive: true, explodeRadius: 100, bulletSpeedMul: 0.55, bulletLifeMul: 0.5 },
};

/** Matches BASE_STATS.fireRate (src/constants.ts) - deliberately doesn't
 *  include the client's meta-progression permanent fire-rate bonus or class
 *  bonuses (e.g. Gunner's +40%), since those aren't synced to the server at
 *  all (out of scope - meta/class progression isn't part of this task). */
export const BASE_FIRE_RATE = 3.2;

/** Matches mutationFireRateMul() (src/systems/combat.ts): +50% fire rate
 *  while the 'overclocked' mutation is equipped. */
export const OVERCLOCKED_FIRE_RATE_MUL = 1.5;

/** Generous slack on the per-shot minimum-interval check so legitimate fast
 *  weapon+mutation combos (e.g. machinegun+overclocked, ~90ms nominal) don't
 *  get false-rejected by ordinary network jitter — spirit of the existing
 *  SPEED_CHECK_SLACK, but multiplicatively loosening the floor downward
 *  instead of the speed cap upward. */
export const SHOT_INTERVAL_SLACK = 0.82;

/** Matches BURN_CHANCE/BURN_DURATION_MS/BURN_DAMAGE_FRACTION in
 *  src/constants.ts exactly - pyromaniac's on-hit burn chance/duration/rate. */
export const BURN_CHANCE = 0.25;
export const BURN_DURATION_MS = 5000;
export const BURN_DAMAGE_FRACTION = 0.2;

/** Vampire's on-hit lifesteal fraction (src/systems/update.ts): heals the
 *  shooter for 2% of the damage a hit actually dealt, capped at maxHp. */
export const VAMPIRE_LIFESTEAL_FRACTION = 0.02;

/** Titan/overclocked mutation stat deltas, applied once at mutationChoice
 *  time (mirrors MUTATION_DEFS' apply() functions in src/constants.ts
 *  exactly - vampire/pyromaniac are no-ops here too, their effects are all
 *  in the hit-resolution/fire-rate code instead). */
export const TITAN_MAX_HP_BONUS = 400;
export const TITAN_RADIUS_MUL = 2;
export const OVERCLOCKED_RADIUS_MUL = 1.35;

// ---------------- Day/night + Blood Moon ----------------
// Copied from src/state.ts's dayNight.total / src/systems/wave.ts's
// bloodMul(1.3)/spawn-speedup(5x) constants - same standalone-project "own
// copy" pattern as the weapon/structure stats above. If the cycle length or
// the 0.5 night threshold in Room.ts's updateDayNight() is ever retuned
// client-side, it must be mirrored here by hand - there's no shared module
// between client and server to keep these in sync automatically.

/** Full day+night cycle length, matching the client's dayNight.total
 *  exactly. Night is the middle half of the cycle (cosine factor > 0.5). */
export const DAY_NIGHT_TOTAL_MS = 110000;

/** Matches wave.ts's `bloodMul = bloodMoon.active ? 1.3 : 1` - applied only
 *  to zombie-vs-player damage and spawned-zombie hp/maxHp server-side (NOT
 *  zombie-vs-structure damage, which solo computes from a flat per-zombie-
 *  type rate independent of this multiplier - see Room.ts's
 *  resolveCollisions() for the exact split). */
export const BLOOD_MOON_HP_DMG_MULTIPLIER = 1.3;

/** Matches updateWaves()'s Blood-Moon spawn-timer divisor
 *  (`spawnTimer * (bloodMoon.active ? 1/5 : 1)`) - server has no wave-based
 *  spawn timer, so this scales the flat zombie-spawn interval instead, the
 *  closest faithful equivalent given the server's simpler spawn model. */
export const BLOOD_MOON_SPAWN_SPEEDUP = 5;

export interface DayNightSnapshot {
  type: 'daynight';
  time: number;
  factor: number;
  isNight: boolean;
  nightCount: number;
  bloodMoonActive: boolean;
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
  /** Lets the client render the distinct grenade-launcher sprite
   *  (drawPlayer.ts's drawBullets()) instead of a plain colored streak -
   *  purely visual, doesn't affect splash-damage resolution (server-side). */
  explosive?: boolean;
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

export function isRemovePacket(value: any): value is RemovePacket {
  return value && value.type === 'remove' && typeof value.structureId === 'string';
}

/** Rejects 'pistol' - it's the default starting weapon, not something a
 *  player chooses via this packet (matches the client's choice UI, which
 *  filters 'pistol' out of the offered cards). */
export function isWeaponChoicePacket(value: any): value is WeaponChoicePacket {
  return (
    value &&
    value.type === 'weaponChoice' &&
    typeof value.weapon === 'string' &&
    value.weapon !== 'pistol' &&
    WEAPON_KINDS.includes(value.weapon)
  );
}

export function isMutationChoicePacket(value: any): value is MutationChoicePacket {
  return (
    value &&
    value.type === 'mutationChoice' &&
    typeof value.mutation === 'string' &&
    MUTATION_KINDS.includes(value.mutation)
  );
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
