import { ZombieKind, HairKind, MouthKind, Zombie } from '../types';
import {
  WORLD_W, WORLD_H, ZTYPE, SKIN_VARIANTS, CLOTH_COLORS,
  BLOOD_MOON_DURATION_MS, BLOOD_MOON_MIN_GAP_MS, BLOOD_MOON_MAX_GAP_MS
} from '../constants';
import {
  player, wave, setWave, zombiesToSpawn, setZombiesToSpawn, spawnTimer, setSpawnTimer,
  waveClearedAt, setWaveClearedAt, nextWaveDelay, waveState, setWaveState,
  isBossWave, setIsBossWave, activeBoss, setActiveBoss, zombies, setZombies,
  crates, setCrates, resources, setResources, decor, setDecor, terrainPatches,
  setTerrainPatches, fireflies, setFireflies, dayNight, bloodMoon
} from '../state';
import { rand, clamp, dist, byId } from '../utils';
import { showBanner, gainXp } from './combat';

export function generateWorld(): void {
  const newResources = [];
  const newDecor = [];
  const newTerrainPatches = [];
  const newFireflies = [];
  const safeZone = 260;

  for (let i = 0; i < 140; i++) {
    let x: number, y: number;
    do { x = rand(80, WORLD_W - 80); y = rand(80, WORLD_H - 80); }
    while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < safeZone);
    newResources.push({ type: 'tree' as const, x, y, radius: 19, hp: 30, maxHp: 30 });
  }
  for (let i = 0; i < 70; i++) {
    let x: number, y: number;
    do { x = rand(80, WORLD_W - 80); y = rand(80, WORLD_H - 80); }
    while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < safeZone);
    newResources.push({ type: 'rock' as const, x, y, radius: 21, hp: 50, maxHp: 50 });
  }
  for (let i = 0; i < 260; i++) {
    newDecor.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), a: rand(0, Math.PI * 2), s: rand(0.7, 1.3) });
  }
  for (let i = 0; i < 55; i++) {
    newTerrainPatches.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), r: rand(60, 160), dark: Math.random() < 0.6 });
  }
  for (let i = 0; i < 50; i++) {
    newFireflies.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), phase: rand(0, Math.PI * 2), speed: rand(0.0008, 0.0016) });
  }

  setResources(newResources);
  setDecor(newDecor);
  setTerrainPatches(newTerrainPatches);
  setFireflies(newFireflies);
}

export function maybeSpawnCrate(): void {
  if (Math.random() > 0.55) return;
  const angle = rand(0, Math.PI * 2), d = rand(300, 1000);
  const x = clamp(player.x + Math.cos(angle) * d, 60, WORLD_W - 60);
  const y = clamp(player.y + Math.sin(angle) * d, 60, WORLD_H - 60);
  crates.push({ x, y, radius: 16 });
}

export function startWave(n: number): void {
  setWave(n);
  setIsBossWave(n % 10 === 0);
  setSpawnTimer(0);
  setActiveBoss(null);

  if (n % 10 === 0) {
    setZombiesToSpawn(6);
    setWaveState('spawning-boss');
    showBanner(`BOSS WAVE ${n}`, 'Something big is coming...', 'boss');
  } else {
    setZombiesToSpawn(4 + n * 3);
    setWaveState('spawning');
    showBanner(`WAVE ${n}`, 'Zombies incoming');
  }
  maybeSpawnCrate();
}

export function pickZombieType(): ZombieKind {
  if (wave < 3) return 'normal';
  if (wave < 5) return Math.random() < 0.3 ? 'scout' : 'normal';
  if (wave < 7) {
    const r = Math.random();
    return r < 0.4 ? 'normal' : (r < 0.65 ? 'scout' : (r < 0.85 ? 'brute' : 'spitter'));
  }
  const r = Math.random();
  if (r < 0.28) return 'normal';
  if (r < 0.5) return 'scout';
  if (r < 0.68) return 'brute';
  if (r < 0.86) return 'spitter';
  return 'exploder';
}

export function spawnZombie(forceType?: ZombieKind): void {
  const angle = rand(0, Math.PI * 2);
  const d = rand(900, 1300);
  let x = clamp(player.x + Math.cos(angle) * d, 40, WORLD_W - 40);
  let y = clamp(player.y + Math.sin(angle) * d, 40, WORLD_H - 40);
  const type = forceType || pickZombieType();
  const def = ZTYPE[type];
  const hpScale = 1 + (wave - 1) * 0.32;
  const speedScale = Math.min(1 + (wave - 1) * 0.045, 1.9);
  const bloodMul = bloodMoon.active ? 1.3 : 1;
  const hp0 = Math.round(24 * hpScale * def.hpMul * bloodMul);
  const usesVariant = (type === 'normal' || type === 'scout');
  const variant = usesVariant ? SKIN_VARIANTS[Math.floor(rand(0, SKIN_VARIANTS.length))] : [def.color, def.color2, def.dark];
  const cloth = (type === 'boss') ? null : CLOTH_COLORS[Math.floor(rand(0, CLOTH_COLORS.length))];
  const z: Zombie = {
    type, x, y, radius: rand(def.radiusR[0], def.radiusR[1]),
    hp: hp0, maxHp: hp0, speed: 1.15 * speedScale * def.speedMul,
    damage: (7 + wave * 0.6) * def.dmgMul * bloodMul,
    hitCooldown: 0, wobble: rand(0, Math.PI * 2), flash: 0, lastShot: 0, fuseStart: null,
    hairKind: (type === 'boss' || type === 'exploder') ? null : (['bald', 'hood', 'tuft'] as HairKind[])[Math.floor(rand(0, 3))],
    mouthKind: (['open', 'frown', 'grimace'] as MouthKind[])[Math.floor(rand(0, 3))],
    squishX: rand(0.92, 1.08), squishY: rand(0.92, 1.08),
    skinColor: variant[0], skinColor2: variant[1], skinDark: variant[2], clothColor: cloth
  };
  z.maxHp = z.hp;
  if (type === 'spitter') { z.projDamage = (6 + wave * 0.7) * bloodMul; }
  if (type === 'exploder') { z.explodeDamage = (16 + wave * 1.4) * bloodMul; }
  if (type === 'boss') {
    z.radius = 92;
    z.hp = Math.round((420 + (wave / 10) * 260) * bloodMul);
    z.maxHp = z.hp;
    z.speed = 0.95;
    z.damage = (22 + wave * 1.1) * bloodMul;
    setActiveBoss(z);
    byId('bossBar').classList.add('show');
    byId('bossName').textContent = 'BOSS · WAVE ' + wave;
  }
  zombies.push(z);
}

export function updateBloodMoon(): void {
  const now = performance.now();
  if (bloodMoon.active) {
    if (now >= bloodMoon.endsAt) {
      bloodMoon.active = false;
      bloodMoon.nextAt = now + rand(BLOOD_MOON_MIN_GAP_MS, BLOOD_MOON_MAX_GAP_MS);
      showBanner('BLOOD MOON FADES', 'The red sky clears...', 'blood');
    }
  } else if (now >= bloodMoon.nextAt) {
    bloodMoon.active = true;
    bloodMoon.endsAt = now + BLOOD_MOON_DURATION_MS;
    showBanner('BLOOD MOON RISING', 'Zombies spawn faster and hit harder...', 'blood');
  }
}

export function updateDayNight(dt: number): void {
  dayNight.time = (dayNight.time + dt) % dayNight.total;
  const frac = dayNight.time / dayNight.total;
  dayNight.factor = (1 - Math.cos(frac * Math.PI * 2)) / 2;
  const wasNight = dayNight.isNight;
  dayNight.isNight = dayNight.factor > 0.5;
  if (dayNight.isNight !== wasNight) {
    if (dayNight.isNight) showBanner('NIGHTFALL', 'Zombies grow bolder and faster...', 'night');
    else showBanner('DAYBREAK', 'A short reprieve...');
  }
  const label = byId('phaseLabel');
  if (bloodMoon.active) { label.textContent = '🩸 BLOOD MOON'; label.className = 'pill hud-font blood'; }
  else if (dayNight.isNight) { label.textContent = '🌙 NIGHT'; label.className = 'pill hud-font night'; }
  else { label.textContent = '☀ DAY'; label.className = 'pill hud-font day'; }

  if (dayNight.factor > 0.55) {
    dayNight.nightSpawnTimer -= dt;
    if (dayNight.nightSpawnTimer <= 0 && zombies.length < 45) {
      spawnZombie(Math.random() < 0.7 ? 'normal' : 'scout');
      dayNight.nightSpawnTimer = rand(4500, 8000);
    }
  } else {
    dayNight.nightSpawnTimer = rand(4500, 8000);
  }
}

export function updateWaves(dt: number): void {
  if (waveState === 'idle') {
    startWave(1);
  } else if (waveState === 'spawning' || waveState === 'spawning-boss') {
    setSpawnTimer(spawnTimer - dt);
    if (spawnTimer <= 0 && zombiesToSpawn > 0) {
      if (waveState === 'spawning-boss' && zombiesToSpawn === 1) {
        spawnZombie('boss');
      } else {
        spawnZombie();
      }
      setZombiesToSpawn(zombiesToSpawn - 1);
      setSpawnTimer((isBossWave ? 500 : 650) / (bloodMoon.active ? 5 : 1));
    }
    if (zombiesToSpawn <= 0) setWaveState('active');
  } else if (waveState === 'active') {
    if (activeBoss) {
      byId('bossFill').style.width = Math.max(0, (activeBoss.hp / activeBoss.maxHp * 100)) + '%';
    }
    if (zombies.length === 0) {
      setWaveState('cleared');
      setWaveClearedAt(performance.now());
      const bonus = isBossWave ? 150 : 40;
      gainXp(bonus);
      byId('bossBar').classList.remove('show');
      showBanner(`WAVE ${wave} CLEARED`, '+' + bonus + ' bonus xp · next wave incoming...');
    }
  } else if (waveState === 'cleared') {
    if (performance.now() - waveClearedAt > nextWaveDelay) {
      startWave(wave + 1);
    }
  }
}
