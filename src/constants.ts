import {
  PowerupKind, PowerUpDef, ZombieKind, WeaponKind, WeaponDef,
  MutationKind, MutationDef, ShopCategory, MetaPerm, PermDef,
  StartBonusDef, MetaSkinDef, ClassDef, StructureKind, BuildDef,
  StructureTierDef, ZombieTypeDef
} from './types';

export const WORLD_W = 4200;
export const WORLD_H = 4200;
export const TILE = 32;
export const BUILD_REACH = TILE * 6;

// Baked in at build time from the WS_URL env var (see scripts/build-client.js)
// so this doesn't need hand-editing per release; falls back to local dev if
// the build didn't define it (e.g. `npm run watch`'s raw esbuild CLI, which
// doesn't go through build-client.js and never sets __WS_URL__ at all).
declare const __WS_URL__: string | undefined;
export const WS_URL = typeof __WS_URL__ !== 'undefined' ? __WS_URL__ : 'ws://localhost:8081/ws';

export const BASE_STATS = {
  radius: 22, maxHp: 100, maxSpeed: 4.2, accel: 0.55, friction: 0.87,
  damage: 12, bulletSpeed: 9.5, bulletRadius: 5, fireRate: 3.2, regen: 0.06
};

export const POWERUP_DEFS: Record<PowerupKind, PowerUpDef> = {
  nuke:   { label: 'NUKE',       color: '#ff5c5c', symbol: 'N' },
  insta:  { label: 'INSTA-KILL', color: '#ffd76a', symbol: '!', duration: 20000 },
  double: { label: '2x XP',      color: '#4ecdc4', symbol: '2', duration: 30000 },
  heal:   { label: 'FULL HEAL',  color: '#8bd17c', symbol: '+' }
};

export const POINTS_BY_TYPE: Record<ZombieKind, number> = {
  normal: 10, scout: 8, brute: 22, spitter: 16, exploder: 16, wolf: 12, boss: 600, spider: 15, witch: 25
};

export const POWERUP_LIFETIME_MS = 20000;

export const WEAPON_DEFS: Record<WeaponKind, WeaponDef> = {
  pistol:          { label: 'Pistol',           desc: 'Reliable sidearm.',                                             playstyle: '', fireRateMul: 1,    damageMul: 1 },
  dualguns:        { label: 'Dual Guns',        desc: 'Twin pistols — +50% fire rate, -35% damage per shot.',          playstyle: 'Fast attacking and mobile.',        fireRateMul: 1.5,  damageMul: 0.65, pellets: 2 },
  machinegun:      { label: 'Machine Gun',      desc: 'Very high fire rate, heavy sustained damage, slows you while firing.', playstyle: 'Good against large zombie groups.', fireRateMul: 2.3,  damageMul: 0.9,  moveSpeedMulWhileFiring: 0.6 },
  shotgun:         { label: 'Shotgun',          desc: '3-shot spread, devastating up close, falls off at range.',      playstyle: 'High-risk close combat.',           fireRateMul: 1,    damageMul: 0.65, pellets: 3, spreadRad: 0.22, bulletLifeMul: 0.55 },
  grenadelauncher: { label: 'Grenade Launcher', desc: 'Slow-firing explosive shells, heavy splash damage, short range.', playstyle: 'Crowd control weapon.',            fireRateMul: 0.35, damageMul: 2.6,  explosive: true, explodeRadius: 100, bulletSpeedMul: 0.55, bulletLifeMul: 0.5 }
};

export const OVERHEAT_MAX = 100;
export const OVERHEAT_PER_SHOT = 14;
export const OVERHEAT_DECAY_PER_SEC = 25;
export const OVERHEAT_LOCKOUT_MS = 2200;
export const BURN_CHANCE = 0.25;
export const BURN_DURATION_MS = 5000;
export const BURN_DAMAGE_FRACTION = 0.2;

export const MUTATION_DEFS: Record<MutationKind, MutationDef> = {
  vampire:     { label: 'Vampire',     desc: 'Heal 2% of damage dealt. +25% movement speed.',                         playstyle: 'Aggressive survival.',              apply: () => {} },
  overclocked: { label: 'Overclocked', desc: '+50% fire rate. Weapon overheats with sustained fire. +35% size.',      playstyle: 'High damage but requires management.', apply: p => { p.radius *= 1.35; } },
  titan:       { label: 'Titan',       desc: '+400 max HP. -15% movement speed. +100% size.',                        playstyle: 'Tank build.',                        apply: p => { p.maxHp += 400; p.hp += 400; p.radius *= 2; } },
  pyromaniac:  { label: 'Pyromaniac',  desc: 'Bullets have a chance to burn enemies for damage over time.',           playstyle: 'Damage over time build.',            apply: () => {} }
};

export const BOOST_MS = 45000;
export const SKIN_TINTS: Record<string, [string, string]> = {
  crimson:  ['#ff9a9a', '#d45c5c'],
  azure:    ['#9ad2ff', '#5c9dd4'],
  golden:   ['#ffe9a0', '#d4b04a'],
  shadow:   ['#a8a8b8', '#5c5c66'],
  verdant:  ['#9aff9a', '#4a9a5c'],
  obsidian: ['#5a5a66', '#26262e']
};

export const PERM_DEFS: Record<keyof MetaPerm, PermDef> = {
  hp:      { label: 'Vitality', desc: '+10 max HP',       costBase: 8,  bonus: lvl => lvl * 10 },
  speed:   { label: 'Speed',    desc: '+0.12 speed',      costBase: 10, bonus: lvl => lvl * 0.12 },
  damage:  { label: 'Power',    desc: '+1 damage',        costBase: 9,  bonus: lvl => lvl * 1 },
  rate:    { label: 'Reload',   desc: '+0.08 rate/s',     costBase: 12, bonus: lvl => lvl * 0.08 },
  regen:   { label: 'Recovery', desc: '+0.03 HP regen',   costBase: 10, bonus: lvl => lvl * 0.03 },
  fortune: { label: 'Fortune',  desc: '+5% shop points',   costBase: 11, bonus: lvl => lvl * 0.05 }
};

export const START_BONUS_DEFS: StartBonusDef[] = [
  { key: 'headstart', label: 'Head Start', desc: '+50 wood, +50 stone at run start', cost: 60 },
  { key: 'nestegg',   label: 'Nest Egg',   desc: '+30 shop points at run start',      cost: 80 }
];

export const META_SKIN_DEFS: MetaSkinDef[] = [
  { key: 'verdant',  label: 'Verdant',  cost: 70 },
  { key: 'obsidian', label: 'Obsidian', cost: 110 }
];

export const MODE_DEFS: Record<'solo' | 'team', { label: string; desc: string }> = {
  solo: { label: 'Singleplayer', desc: 'Survive alone, at your own pace.' },
  team: { label: 'Team Mode', desc: '2-4 players queue up and ready up to start together.' }
};

export const SETTINGS_KEY = 'nightfall_settings';

export const CLASS_DEFS: Record<string, ClassDef> = {
  gunner:    { label: 'Gunner',    desc: '+40% fire rate, -15% max HP', apply: p => { p.fireRate *= 1.4; p.maxHp = Math.round(p.maxHp * 0.85); } },
  builder:   { label: 'Builder',   desc: 'Structures 30% cheaper, +30 starting wood', apply: p => { p.buildDiscount = 0.7; p.wood += 30; } },
  scavenger: { label: 'Scavenger', desc: '+50% resource yield & harvest XP', apply: p => { p.resourceMul = 1.5; } }
};

export const BUILD_DEFS: Record<StructureKind, BuildDef> = {
  wall:     { label: 'Wall',          wood: 15, stone: 0,  hp: 80,  radius: 14, color: ['#c9a668', '#9aa3a6', '#c7cfd2'] },
  spike:    { label: 'Spike',         wood: 10, stone: 5,  hp: 40,  radius: 10, damage: 9 },
  campfire: { label: 'Campfire',      wood: 20, stone: 0,  hp: 50,  radius: 20, healRadius: 150, healRate: 5 },
  shop:     { label: 'Shop',          wood: 40, stone: 35, hp: 120, radius: 24 },
  factory:  { label: 'Factory',       wood: 50, stone: 40, hp: 150, radius: 28 },
  cannon:   { label: 'Cannon',        wood: 25, stone: 20, hp: 70,  radius: 20, range: 250, fireRate: 1.0, damage: 15 },
  mortar:   { label: 'Mortar',        wood: 35, stone: 25, hp: 80,  radius: 22, range: 400, fireRate: 0.4, damage: 40 },
  sniper:   { label: 'Sniper',        wood: 40, stone: 30, hp: 60,  radius: 20, range: 600, fireRate: 0.25, damage: 120 },
  tesla:    { label: 'Tesla Tower',   wood: 30, stone: 30, hp: 70,  radius: 20, range: 240, fireRate: 0.8, damage: 20 },
  frost:    { label: 'Frost Tower',   wood: 30, stone: 25, hp: 90,  radius: 22, range: 200, fireRate: 1.0, damage: 5 },
  toxic:    { label: 'Toxic Spitter', wood: 35, stone: 30, hp: 80,  radius: 20, range: 340, fireRate: 0.25, damage: 10 }
};

export const STRUCTURE_TIERS: Record<'wall' | 'spike', StructureTierDef[]> = {
  wall: [
    { name: 'Wood',  hpMax: 80,  pointsCost: 0 },
    { name: 'Stone', hpMax: 170, pointsCost: 40 },
    { name: 'Metal', hpMax: 280, pointsCost: 90 }
  ],
  spike: [
    { name: 'Sharp',    hpMax: 40, damage: 9,  pointsCost: 0 },
    { name: 'Barbed',   hpMax: 65, damage: 16, pointsCost: 45 },
    { name: 'Serrated', hpMax: 95, damage: 26, pointsCost: 95 }
  ]
};

export interface TowerLevelSpec {
  damage: number;
  fireRate: number;
  range: number;
  specialValue?: number; // slow %, chain count, splash radius, etc.
  cost: { resource: 'wood' | 'stone' | 'iron' | 'gold'; amount: number } | null;
}

export const TOWER_LEVELS: Record<'cannon' | 'mortar' | 'sniper' | 'tesla' | 'frost' | 'toxic', TowerLevelSpec[]> = {
  cannon: [
    { damage: 15, fireRate: 1.0, range: 250, cost: null },
    { damage: 22, fireRate: 1.1, range: 275, cost: { resource: 'wood', amount: 10 } },
    { damage: 32, fireRate: 1.25, range: 300, cost: { resource: 'stone', amount: 15 } },
    { damage: 48, fireRate: 1.4, range: 325, cost: { resource: 'iron', amount: 8 } },
    { damage: 75, fireRate: 1.6, range: 350, cost: { resource: 'gold', amount: 3 } }
  ],
  mortar: [
    { damage: 40, fireRate: 0.4, range: 400, specialValue: 125, cost: null }, // splash radius 125px
    { damage: 60, fireRate: 0.45, range: 420, specialValue: 140, cost: { resource: 'wood', amount: 15 } },
    { damage: 90, fireRate: 0.5, range: 440, specialValue: 160, cost: { resource: 'stone', amount: 20 } },
    { damage: 135, fireRate: 0.55, range: 460, specialValue: 180, cost: { resource: 'iron', amount: 12 } },
    { damage: 210, fireRate: 0.6, range: 480, specialValue: 200, cost: { resource: 'gold', amount: 4 } }
  ],
  tesla: [
    { damage: 20, fireRate: 0.8, range: 240, specialValue: 3, cost: null }, // chain count 3
    { damage: 30, fireRate: 0.9, range: 260, specialValue: 3, cost: { resource: 'wood', amount: 12 } },
    { damage: 45, fireRate: 1.0, range: 280, specialValue: 4, cost: { resource: 'stone', amount: 18 } },
    { damage: 65, fireRate: 1.1, range: 300, specialValue: 5, cost: { resource: 'iron', amount: 10 } },
    { damage: 100, fireRate: 1.3, range: 320, specialValue: 6, cost: { resource: 'gold', amount: 3 } }
  ],
  sniper: [
    { damage: 120, fireRate: 0.25, range: 600, cost: null },
    { damage: 180, fireRate: 0.28, range: 650, cost: { resource: 'wood', amount: 18 } },
    { damage: 270, fireRate: 0.32, range: 700, cost: { resource: 'stone', amount: 25 } },
    { damage: 400, fireRate: 0.35, range: 750, cost: { resource: 'iron', amount: 15 } },
    { damage: 650, fireRate: 0.4, range: 800, cost: { resource: 'gold', amount: 5 } }
  ],
  frost: [
    { damage: 5, fireRate: 1.0, range: 200, specialValue: 0.20, cost: null }, // slow rate 20%
    { damage: 8, fireRate: 1.0, range: 225, specialValue: 0.25, cost: { resource: 'wood', amount: 12 } },
    { damage: 13, fireRate: 1.0, range: 250, specialValue: 0.32, cost: { resource: 'stone', amount: 18 } },
    { damage: 20, fireRate: 1.0, range: 275, specialValue: 0.40, cost: { resource: 'iron', amount: 10 } },
    { damage: 32, fireRate: 1.0, range: 300, specialValue: 0.50, cost: { resource: 'gold', amount: 3 } }
  ],
  toxic: [
    { damage: 10, fireRate: 0.25, range: 340, specialValue: 5, cost: null }, // armor reduction 5
    { damage: 16, fireRate: 0.25, range: 360, specialValue: 8, cost: { resource: 'wood', amount: 15 } },
    { damage: 25, fireRate: 0.25, range: 380, specialValue: 12, cost: { resource: 'stone', amount: 20 } },
    { damage: 38, fireRate: 0.25, range: 400, specialValue: 18, cost: { resource: 'iron', amount: 12 } },
    { damage: 58, fireRate: 0.25, range: 420, specialValue: 25, cost: { resource: 'gold', amount: 4 } }
  ]
};

export const ZTYPE: Record<ZombieKind, ZombieTypeDef> = {
  normal:   { radiusR: [17, 23], hpMul: 1,    speedMul: 1,    dmgMul: 1,   color: '#4c8a52', color2: '#3a6b40', dark: '#274d2b' },
  scout:    { radiusR: [12, 15], hpMul: 0.55, speedMul: 1.7,  dmgMul: 0.7, color: '#c9c24e', color2: '#a8a13c', dark: '#7a742a' },
  brute:    { radiusR: [28, 33], hpMul: 2.4,  speedMul: 0.65, dmgMul: 1.8, color: '#8a3d3d', color2: '#6e2f2f', dark: '#4d2020' },
  spitter:  { radiusR: [15, 18], hpMul: 0.7,  speedMul: 0.55, dmgMul: 0,   color: '#5a9151', color2: '#437040', dark: '#2b4526', ranged: true, range: 340, fireRate: 0.8 },
  exploder: { radiusR: [19, 24], hpMul: 0.6,  speedMul: 1.5,  dmgMul: 0,   color: '#c07a2e', color2: '#9c5c1e', dark: '#5c2e0d', explode: true, explodeRadius: 95 },
  wolf:     { radiusR: [16, 20], hpMul: 0.5,  speedMul: 1.85, dmgMul: 1.1, color: '#7a8a95', color2: '#5c6b75', dark: '#3a444c' },
  spider:   { radiusR: [14, 17], hpMul: 0.8,  speedMul: 1.35, dmgMul: 0.8, color: '#2c3e50', color2: '#1a252f', dark: '#0e141a', ranged: true, range: 300, fireRate: 0.4 },
  witch:    { radiusR: [16, 19], hpMul: 1.4,  speedMul: 0.8,  dmgMul: 0.9, color: '#8e44ad', color2: '#7d3c98', dark: '#4a235a', ranged: true, range: 380, fireRate: 0.5 },
  boss:     { radiusR: [54, 54], hpMul: 1,    speedMul: 1,    dmgMul: 1,   color: '#4b2a63', color2: '#3a1f4d', dark: '#241333' }
};

export const SKIN_VARIANTS: [string, string, string][] = [
  ['#4c8a52', '#3a6b40', '#274d2b'],
  ['#5c9a5a', '#457a44', '#2e552e'],
  ['#7a9350', '#5c723c', '#3a4a26'],
  ['#8a7550', '#6b5938', '#453824'],
  ['#6e8a4a', '#546b38', '#374524']
];

export const CLOTH_COLORS = ['#5a2a2a', '#2a3a5a', '#3a3a3a', '#4a3320', '#2a4a3a', null];

export const BLOOD_MOON_DURATION_MS = 60000;
export const BLOOD_MOON_MIN_GAP_MS = 60000;
export const BLOOD_MOON_MAX_GAP_MS = 1800000;

export const ARM_SHADOW = '#4d3f7a';

export const GRASS_DAY = '#8fa72d';
export const GRASS_NIGHT = '#26330f';
export const TUFT_DAY = '#7c9426';
export const TUFT_NIGHT = '#1c260c';

export const MINIMAP_SIZE = 150;
export const MINIMAP_MARGIN = 16;

export const DEBUG_PASSWORD = 'agi123';
