import {
  PlayerState, Zombie, Bullet, Resource, Structure, Crate, PowerUpEntity,
  TextParticle, Burst, BloodDecal, DecorTuft, TerrainPatch, Firefly, StarDot,
  MetaProgress, DayNightState, BloodMoonState, CameraState, GameSettings, ShakeState,
  LobbyPlayer, StructureKind, Vec2, FireZone, ToxicCloud
} from './types';
import { WORLD_W, WORLD_H, BASE_STATS } from './constants';

export const hasStorage = typeof window.storage !== 'undefined';

export const keys: Record<string, boolean> = {};
export const mouse: { x: number; y: number; down: boolean } = { x: 0, y: 0, down: false };
export const touchMove: Vec2 = { x: 0, y: 0 };
export const touchAim: Vec2 = { x: 0, y: 0 };
export let isTouchActive = false;
export function setIsTouchActive(val: boolean): void { isTouchActive = val; }

export let running = false;
export function setRunning(val: boolean): void { running = val; }

// ---------------- Multiplayer match state ----------------
// True only while actually playing an active server-driven match (after the
// lobby countdown completes) — see src/net/matchSync.ts. Solo play never
// touches this; it stays false and every system behaves exactly as before.
export let inNetMatch = false;
export function setInNetMatch(val: boolean): void { inNetMatch = val; }

import { WeaponKind } from './types';

export interface RemotePlayer {
  id: string; name: string; x: number; y: number; angle: number;
  hp: number; maxHp: number; alive: boolean;
  weapon?: WeaponKind;
  renderX?: number; renderY?: number; renderAngle?: number;
  targetX?: number; targetY?: number; targetAngle?: number;
}
export let remotePlayers: RemotePlayer[] = [];
export function setRemotePlayers(val: RemotePlayer[]): void { remotePlayers = val; }

export let paused = false;
export function setPaused(val: boolean): void { paused = val; }

export let lastTime = 0;
export function setLastTime(val: number): void { lastTime = val; }

export const camera: CameraState = { x: 0, y: 0 };

export let selectedBuild: StructureKind | null = null;
export function setSelectedBuild(val: StructureKind | null): void { selectedBuild = val; }

export let manualBuildAngle: number | null = null;
export function setManualBuildAngle(val: number | null): void { manualBuildAngle = val; }

export let selectedClass = 'gunner';
export function setSelectedClass(val: string): void { selectedClass = val; }

export let selectedMode: 'solo' | 'team' = 'solo';
export function setSelectedMode(val: 'solo' | 'team'): void { selectedMode = val; }

export let playerName = 'Survivor';
export function setPlayerName(val: string): void { playerName = val; }

export const shake: ShakeState = { time: 0, mag: 0 };

export const dayNight: DayNightState = { time: 0, total: 110000, factor: 0, isNight: false, nightSpawnTimer: 6000, nightCount: 0 };

export const bloodMoon: BloodMoonState = { active: false, endsAt: 0, nextAt: 0 };

export const player: PlayerState = {
  x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0, angle: 0,
  radius: BASE_STATS.radius, hp: BASE_STATS.maxHp, maxHp: BASE_STATS.maxHp,
  maxSpeed: BASE_STATS.maxSpeed, accel: BASE_STATS.accel, friction: BASE_STATS.friction,
  damage: BASE_STATS.damage, bulletSpeed: BASE_STATS.bulletSpeed, bulletRadius: BASE_STATS.bulletRadius,
  fireRate: BASE_STATS.fireRate, lastShot: 0,
  level: 1, xp: 0, xpToNext: 50, statPoints: 0,
  points: 0, wood: 0, stone: 0, iron: 0, gold: 0, kills: 0, regen: BASE_STATS.regen, alive: true,
  buildDiscount: 1, resourceMul: 1, fortuneMul: 1,
  instaKillUntil: 0, doubleXpUntil: 0, speedBoostUntil: 0, damageBoostUntil: 0,
  fireRateBoostUntil: 0, regenBoostUntil: 0, secondChance: false, skinTint: null,
  weapon: 'pistol', weaponChosen: false, mutation: null, mutationChosen: false,
  heat: 0, overheatedUntil: 0
};

export let bullets: Bullet[] = [];
export function setBullets(val: Bullet[]): void { bullets = val; }

export let zombies: Zombie[] = [];
export function setZombies(val: Zombie[]): void { zombies = val; }

export let resources: Resource[] = [];
export function setResources(val: Resource[]): void { resources = val; }

export let structures: Structure[] = [];
export function setStructures(val: Structure[]): void { structures = val; }

export let crates: Crate[] = [];
export function setCrates(val: Crate[]): void { crates = val; }

export let powerups: PowerUpEntity[] = [];
export function setPowerups(val: PowerUpEntity[]): void { powerups = val; }

export let particles: TextParticle[] = [];
export function setParticles(val: TextParticle[]): void { particles = val; }

export let bursts: Burst[] = [];
export function setBursts(val: Burst[]): void { bursts = val; }

export let bloodDecals: BloodDecal[] = [];
export function setBloodDecals(val: BloodDecal[]): void { bloodDecals = val; }

export let decor: DecorTuft[] = [];
export function setDecor(val: DecorTuft[]): void { decor = val; }

export let terrainPatches: TerrainPatch[] = [];
export function setTerrainPatches(val: TerrainPatch[]): void { terrainPatches = val; }

export let fireflies: Firefly[] = [];
export function setFireflies(val: Firefly[]): void { fireflies = val; }

export let stars: StarDot[] = [];
export function setStars(val: StarDot[]): void { stars = val; }

export let wave = 0;
export function setWave(val: number): void { wave = val; }

export let zombiesToSpawn = 0;
export function setZombiesToSpawn(val: number): void { zombiesToSpawn = val; }

export let spawnTimer = 0;
export function setSpawnTimer(val: number): void { spawnTimer = val; }

export let waveClearedAt = 0;
export function setWaveClearedAt(val: number): void { waveClearedAt = val; }

export let nextWaveDelay = 4500;
export function setNextWaveDelay(val: number): void { nextWaveDelay = val; }

export let waveState: 'idle' | 'spawning' | 'spawning-boss' | 'active' | 'cleared' = 'idle';
export function setWaveState(val: 'idle' | 'spawning' | 'spawning-boss' | 'active' | 'cleared'): void { waveState = val; }

export let isBossWave = false;
export function setIsBossWave(val: boolean): void { isBossWave = val; }

export let activeBoss: Zombie | null = null;
export function setActiveBoss(val: Zombie | null): void { activeBoss = val; }

export function defaultMeta(): MetaProgress {
  return {
    metaPoints: 0, perm: { hp: 0, speed: 0, damage: 0, rate: 0, regen: 0, fortune: 0 },
    lifetimeKills: 0, bestWave: 0, gamesPlayed: 0, name: '',
    startBonuses: {}, unlockedSkins: [], equippedSkin: null
  };
}
export let meta: MetaProgress = defaultMeta();
export function setMeta(val: MetaProgress): void { meta = val; }

export const lobby = {
  players: [] as LobbyPlayer[],
  phase: 'waiting' as 'waiting' | 'countdown' | 'active',
  countdownEndsAt: null as number | null,
  onPlayersChanged: null as (() => void) | null,
  onMatchStart: null as (() => void) | null
};

export function defaultSettings(): GameSettings {
  return { screenShake: true, damageNumbers: true, uiScale: 'medium' };
}
export let settings: GameSettings = defaultSettings();
export function setSettings(val: GameSettings): void { settings = val; }

export let settingsOpenedMidRun = false;
export function setSettingsOpenedMidRun(val: boolean): void { settingsOpenedMidRun = val; }

export let weaponChoiceOpen = false;
export function setWeaponChoiceOpen(val: boolean): void { weaponChoiceOpen = val; }

export let mutationChoiceOpen = false;
export function setMutationChoiceOpen(val: boolean): void { mutationChoiceOpen = val; }

export let shopOpen = false;
export function setShopOpen(val: boolean): void { shopOpen = val; }

export let factoryOpen = false;
export function setFactoryOpen(val: boolean): void { factoryOpen = val; }

export let inspectedStructure: Structure | null = null;
export function setInspectedStructure(val: Structure | null): void { inspectedStructure = val; }

export let debugUnlocked = false;
export function setDebugUnlocked(val: boolean): void { debugUnlocked = val; }

export let debugOpen = false;
export function setDebugOpen(val: boolean): void { debugOpen = val; }

export let godMode = false;
export function setGodMode(val: boolean): void { godMode = val; }

export let debugSpeedMultiplier = 1;
export function setDebugSpeedMultiplier(val: number): void { debugSpeedMultiplier = val; }

export let fireZones: FireZone[] = [];
export function setFireZones(val: FireZone[]): void { fireZones = val; }

export let toxicClouds: ToxicCloud[] = [];
export function setToxicClouds(val: ToxicCloud[]): void { toxicClouds = val; }

export let teslaChains: any[] = [];
export function setTeslaChains(val: any[]): void { teslaChains = val; }

export let sniperLasers: any[] = [];
export function setSniperLasers(val: any[]): void { sniperLasers = val; }

export let reviveHoldingTargetId: string | null = null;
export let reviveHoldTimer = 0;
export function setReviveHoldingTargetId(val: string | null): void { reviveHoldingTargetId = val; }
export function setReviveHoldTimer(val: number): void { reviveHoldTimer = val; }
