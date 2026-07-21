// ===================== NIGHTFALL.IO — type definitions =====================

export interface Vec2 { x: number; y: number; }

export type WeaponKind = 'pistol' | 'dualguns' | 'machinegun' | 'shotgun' | 'grenadelauncher';
export type MutationKind = 'vampire' | 'overclocked' | 'titan' | 'pyromaniac';
export type ZombieKind = 'normal' | 'scout' | 'brute' | 'spitter' | 'exploder' | 'wolf' | 'boss' | 'spider' | 'witch';
export type HairKind = 'bald' | 'hood' | 'tuft' | null;
export type MouthKind = 'open' | 'frown' | 'grimace';
export type StructureKind = 'wall' | 'spike' | 'turret' | 'campfire' | 'shop';
export type PowerupKind = 'nuke' | 'insta' | 'double' | 'heal';

export interface PlayerState {
  x: number; y: number; vx: number; vy: number; angle: number;
  radius: number; hp: number; maxHp: number;
  maxSpeed: number; accel: number; friction: number;
  damage: number; bulletSpeed: number; bulletRadius: number; fireRate: number; lastShot: number;
  level: number; xp: number; xpToNext: number; statPoints: number;
  points: number; wood: number; stone: number; kills: number; regen: number; alive: boolean;
  buildDiscount: number; resourceMul: number; fortuneMul: number;
  instaKillUntil: number; doubleXpUntil: number;
  speedBoostUntil: number; damageBoostUntil: number; fireRateBoostUntil: number; regenBoostUntil: number;
  secondChance: boolean; skinTint: string | null;
  weapon: WeaponKind; weaponChosen: boolean;
  mutation: MutationKind | null; mutationChosen: boolean;
  heat: number; overheatedUntil: number;
  slowedUntil?: number;
}

export interface Zombie {
  type: ZombieKind; x: number; y: number; radius: number;
  hp: number; maxHp: number; speed: number; damage: number;
  hitCooldown: number; wobble: number; flash: number; lastShot: number; fuseStart: number | null;
  hairKind: HairKind; mouthKind: MouthKind; squishX: number; squishY: number;
  skinColor: string; skinColor2: string; skinDark: string; clothColor: string | null;
  spikeCd?: number; projDamage?: number; explodeDamage?: number; dead?: boolean;
  burnUntil?: number; burnDamagePerSec?: number;
  lastSummon?: number;
}

export interface Bullet {
  x: number; y: number; vx: number; vy: number; radius: number; damage: number; life: number;
  owner: 'player' | 'turret' | 'zombie'; insta?: boolean; dead?: boolean;
  explosive?: boolean; explodeRadius?: number; burn?: boolean;
  slowProj?: boolean;
}

export interface Resource {
  type: 'tree' | 'rock'; x: number; y: number; radius: number; hp: number; maxHp: number; dead?: boolean;
}

export interface Structure {
  type: StructureKind; x: number; y: number; radius: number; hp: number; maxHp: number; angle: number;
  tier?: number; range?: number; fireRate?: number; damage?: number; lastShot?: number;
  healRadius?: number; healRate?: number; aimAngle?: number;
}

export interface Crate { x: number; y: number; radius: number; dead?: boolean; }

export interface PowerUpEntity {
  x: number; y: number; radius: number; kind: PowerupKind; spawnTime: number; dead?: boolean;
}

export interface TextParticle { x: number; y: number; text: string; color: string; life: number; maxLife: number; vy: number; }
export interface Burst { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; radius: number; shape: 'circle' | 'casing'; rot: number; }
export interface BloodDecal { x: number; y: number; r: number; rot: number; alpha: number; }
export interface DecorTuft { x: number; y: number; a: number; s: number; }
export interface TerrainPatch { x: number; y: number; r: number; dark: boolean; }
export interface Firefly { x: number; y: number; phase: number; speed: number; }
export interface StarDot { xf: number; yf: number; r: number; phase: number; }

export interface MetaPerm { hp: number; speed: number; damage: number; rate: number; regen: number; fortune: number; }
export interface MetaProgress {
  metaPoints: number; perm: MetaPerm;
  lifetimeKills: number; bestWave: number; gamesPlayed: number; name: string;
  startBonuses: Record<string, boolean>;
  unlockedSkins: string[]; equippedSkin: string | null;
}
export interface LeaderboardEntry { name: string; wave: number; kills: number; level: number; ts: number; }

export interface PermDef { label: string; desc: string; costBase: number; bonus: (lvl: number) => number; }
export interface StartBonusDef { key: string; label: string; desc: string; cost: number; }
export interface MetaSkinDef { key: string; label: string; cost: number; }
export interface WeaponDef {
  label: string; desc: string; playstyle: string;
  fireRateMul: number; damageMul: number;
  pellets?: number; spreadRad?: number;
  explosive?: boolean; explodeRadius?: number;
  bulletSpeedMul?: number; bulletLifeMul?: number;
  moveSpeedMulWhileFiring?: number;
}
export interface MutationDef { label: string; desc: string; playstyle: string; apply: (p: PlayerState) => void; }
export type ShopCategory = 'powerup' | 'boost' | 'special' | 'cosmetic';
export interface ShopItemDef {
  key: string; category: ShopCategory; label: string; desc: string; cost: number;
  apply: () => void;
  disabledIf?: () => boolean;
  isEquipped?: () => boolean;
}
export interface ClassDef { label: string; desc: string; apply: (p: PlayerState) => void; }
export interface BuildDef {
  label: string; wood: number; stone: number; hp: number; radius: number;
  color?: string[]; damage?: number; range?: number; fireRate?: number; healRadius?: number; healRate?: number;
}
export interface StructureTierDef {
  name: string; hpMax: number; pointsCost: number;
  damage?: number; range?: number; fireRate?: number;
}
export interface ZombieTypeDef {
  radiusR: [number, number]; hpMul: number; speedMul: number; dmgMul: number;
  color: string; color2: string; dark: string;
  ranged?: boolean; range?: number; fireRate?: number;
  explode?: boolean; explodeRadius?: number;
}
export interface PowerUpDef { label: string; color: string; symbol: string; duration?: number; }

export interface DayNightState { time: number; total: number; factor: number; isNight: boolean; nightSpawnTimer: number; }
export interface BloodMoonState { active: boolean; endsAt: number; nextAt: number; }
export interface CameraState { x: number; y: number; }
export interface LobbyPlayer { id: string; name: string; ready: boolean; isLocal: boolean; }
export interface GameSettings { screenShake: boolean; damageNumbers: boolean; uiScale: 'small' | 'medium' | 'large'; }
export interface ShakeState { time: number; mag: number; }

export interface StorageResult { key: string; value: string; shared: boolean; }
export interface StorageAPI {
  get(key: string, shared?: boolean): Promise<StorageResult | null>;
  set(key: string, value: string, shared?: boolean): Promise<StorageResult | null>;
  delete(key: string, shared?: boolean): Promise<{ key: string; deleted: boolean; shared: boolean } | null>;
  list(prefix?: string, shared?: boolean): Promise<{ keys: string[]; prefix?: string; shared: boolean } | null>;
}

declare global {
  interface Window { storage?: StorageAPI; }
}
