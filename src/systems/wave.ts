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
  setTerrainPatches, fireflies, setFireflies, dayNight, bloodMoon, inNetMatch
} from '../state';
import { rand, clamp, dist, byId } from '../utils';
import { showBanner, gainXp } from './combat';
import { registerEncounter } from './codex';

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
  for (let i = 0; i < 45; i++) {
    let x: number, y: number;
    do { x = rand(80, WORLD_W - 80); y = rand(80, WORLD_H - 80); }
    while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < safeZone);
    newResources.push({ type: 'iron' as const, x, y, radius: 23, hp: 110, maxHp: 110 });
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
    // Wolves start showing up here, in small numbers.
    const r = Math.random();
    if (r < 0.38) return 'normal';
    if (r < 0.62) return 'scout';
    if (r < 0.8) return 'brute';
    if (r < 0.92) return 'spitter';
    return 'wolf';
  }
  const pool: { type: ZombieKind; weight: number }[] = [
    { type: 'normal', weight: 100 }
  ];
  if (wave >= 2) pool.push({ type: 'scout', weight: 65 });
  if (wave >= 3) pool.push({ type: 'brute', weight: 40 });
  if (wave >= 4) pool.push({ type: 'wolf', weight: 45 });
  if (wave >= 5) pool.push({ type: 'spitter', weight: 35 });
  if (wave >= 6) pool.push({ type: 'exploder', weight: 30 });
  if (wave >= 8) pool.push({ type: 'spider', weight: 25 });
  if (wave >= 10) pool.push({ type: 'witch', weight: 15 });

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    if (roll < item.weight) return item.type;
    roll -= item.weight;
  }
  return 'normal';
}

export let nextZombieId = 1;
export function resetZombieId(): void { nextZombieId = 1; }

export function spawnZombie(forceType?: ZombieKind, atX?: number, atY?: number): void {
  const type = forceType || pickZombieType();
  let x: number, y: number;
  if (atX !== undefined && atY !== undefined) {
    x = atX; y = atY;
  } else {
    const angle = rand(0, Math.PI * 2);
    const d = rand(900, 1300);
    x = clamp(player.x + Math.cos(angle) * d, 40, WORLD_W - 40);
    y = clamp(player.y + Math.sin(angle) * d, 40, WORLD_H - 40);
  }
  const def = ZTYPE[type];
  const hpScale = 1 + (wave - 1) * 0.32;
  const speedScale = Math.min(1 + (wave - 1) * 0.045, 1.9);
  const bloodMul = bloodMoon.active ? 1.3 : 1;
  const hp0 = Math.round(24 * hpScale * def.hpMul * bloodMul);
  const usesVariant = (type === 'normal' || type === 'scout');
  const variant = usesVariant ? SKIN_VARIANTS[Math.floor(rand(0, SKIN_VARIANTS.length))] : [def.color, def.color2, def.dark];
  const cloth = (type === 'boss' || type === 'wolf') ? null : CLOTH_COLORS[Math.floor(rand(0, CLOTH_COLORS.length))];
  
  let armorVal = 0;
  if (type === 'spider') armorVal = 2;
  else if (type === 'spitter') armorVal = 3;
  else if (type === 'exploder') armorVal = 4;
  else if (type === 'witch') armorVal = 6;
  else if (type === 'brute') armorVal = 12;
  else if (type === 'boss') armorVal = 24;

  const z: Zombie = {
    id: nextZombieId++,
    type, x, y, radius: rand(def.radiusR[0], def.radiusR[1]),
    hp: hp0, maxHp: hp0, speed: 1.15 * speedScale * def.speedMul,
    damage: (7 + wave * 0.6) * def.dmgMul * bloodMul,
    hitCooldown: 0, wobble: rand(0, Math.PI * 2), flash: 0, lastShot: 0, fuseStart: null,
    hairKind: (type === 'boss' || type === 'exploder' || type === 'wolf') ? null : (['bald', 'hood', 'tuft'] as HairKind[])[Math.floor(rand(0, 3))],
    mouthKind: (['open', 'frown', 'grimace'] as MouthKind[])[Math.floor(rand(0, 3))],
    squishX: rand(0.92, 1.08), squishY: rand(0.92, 1.08),
    skinColor: variant[0], skinColor2: variant[1], skinDark: variant[2], clothColor: cloth,
    armor: armorVal
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
  registerEncounter(type);

  // Wolves hunt in packs — a fresh wolf call (not a pack companion, and not a
  // debug-forced spawn) brings 1-2 more along, placed near it rather than at
  // an independent random spot so they actually read as a pack on arrival.
  if (type === 'wolf' && atX === undefined) {
    const packSize = Math.floor(rand(1, 3));
    for (let i = 0; i < packSize; i++) {
      const offAngle = rand(0, Math.PI * 2), offD = rand(35, 80);
      spawnZombie('wolf', clamp(x + Math.cos(offAngle) * offD, 40, WORLD_W - 40), clamp(y + Math.sin(offAngle) * offD, 40, WORLD_H - 40));
    }
  }
}

export function updateBloodMoon(): void {
  // Blood moon is now triggered periodically on specific nights inside updateDayNight()
}

export function updateDayNight(dt: number): void {
  if (!dayNight.total || dayNight.total <= 0) dayNight.total = 110000;
  if (!Number.isFinite(dayNight.time)) dayNight.time = 0;

  dayNight.time = (dayNight.time + dt) % dayNight.total;
  const frac = (dayNight.time % dayNight.total) / dayNight.total;
  const rawFactor = (1 - Math.cos(frac * Math.PI * 2)) / 2;
  dayNight.factor = Number.isFinite(rawFactor) ? Math.max(0, Math.min(1, rawFactor)) : 0;
  const wasNight = dayNight.isNight;
  dayNight.isNight = dayNight.factor > 0.5;

  if (dayNight.isNight !== wasNight) {
    if (dayNight.isNight) {
      dayNight.nightCount = (dayNight.nightCount || 0) + 1;
      // Periodic Blood Moon: Triggers every 3rd night (Night 3, Night 6, Night 9...)
      if (dayNight.nightCount % 3 === 0) {
        bloodMoon.active = true;
        showBanner('BLOOD MOON RISING', 'A cursed red night begins! Fast & vicious zombies inbound!', 'blood');
      } else {
        bloodMoon.active = false;
        showBanner('NIGHTFALL', 'Zombies emerge from the dark! Defend your base!', 'night');
      }
    } else {
      if (bloodMoon.active) {
        bloodMoon.active = false;
      }
      showBanner('DAYBREAK', 'Safe daylight! Prepare & build your base.', 'night');
    }
  }
  
  // Calculate remaining time for current phase
  let timeLeftSec = 0;
  if (dayNight.isNight) {
    // Night is from frac 0.25 to 0.75 (time 27500 to 82500)
    timeLeftSec = Math.max(0, Math.ceil((82500 - dayNight.time) / 1000));
  } else {
    // Day is from frac 0.75 to 1.0, and 0.0 to 0.25
    if (dayNight.time < 27500) {
      timeLeftSec = Math.max(0, Math.ceil((27500 - dayNight.time) / 1000));
    } else {
      timeLeftSec = Math.max(0, Math.ceil(((dayNight.total - dayNight.time) + 27500) / 1000));
    }
  }

  const label = byId('phaseLabel');
  if (bloodMoon.active) {
    label.textContent = `BLOOD MOON | ${timeLeftSec}s (DANGER!)`;
    label.className = 'pill hud-font blood';
  }
  else if (dayNight.isNight) {
    label.textContent = `NIGHT | ${timeLeftSec}s (ATTACK)`;
    label.className = 'pill hud-font night';
  }
  else {
    label.textContent = `DAY | ${timeLeftSec}s (SAFE - BUILD TIME)`;
    label.className = 'pill hud-font day';
  }

  // Night random spawns — strictly active ONLY at night
  if (dayNight.isNight && dayNight.factor > 0.55) {
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
    return;
  }

  // NO ZOMBIE SPAWNING DURING DAYTIME — Dedicated safe time to build & fortify base
  if (!dayNight.isNight && !bloodMoon.active) {
    return;
  }

  if (waveState === 'spawning' || waveState === 'spawning-boss') {
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
