import {
  PowerupKind, Zombie, Bullet, ZombieKind
} from '../types';
import {
  player, bullets, setBullets, zombies, setZombies, powerups, setPowerups,
  particles, setParticles, bursts, setBursts, bloodDecals, setBloodDecals,
  shake, settings, godMode, activeBoss, setActiveBoss, wave, selectedBuild
} from '../state';
import {
  POWERUP_DEFS, POINTS_BY_TYPE, WEAPON_DEFS, OVERHEAT_PER_SHOT,
  OVERHEAT_MAX, OVERHEAT_LOCKOUT_MS, BURN_CHANCE, ZTYPE
} from '../constants';
import { rand, dist } from '../utils';
import { registerKill } from './codex';

let bannerTimeout: ReturnType<typeof setTimeout> | undefined;

export function showBanner(title: string, sub: string, mode?: 'boss' | 'night' | 'power' | 'blood'): void {
  const el = document.getElementById('waveBanner');
  if (!el) return;
  el.innerHTML = title + '<span>' + sub + '</span>';
  el.classList.toggle('boss', mode === 'boss');
  el.classList.toggle('night', mode === 'night');
  el.classList.toggle('power', mode === 'power');
  el.classList.toggle('blood', mode === 'blood');
  el.classList.add('show');
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => el.classList.remove('show'), 2800);
}

export function awardPoints(amount: number): void {
  player.points += Math.round(amount * player.fortuneMul);
}

export function maybeDropPowerup(x: number, y: number, guaranteed?: boolean): void {
  if (!guaranteed && Math.random() > 0.055) return;
  const kinds = Object.keys(POWERUP_DEFS) as PowerupKind[];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  powerups.push({ x, y, radius: 15, kind, spawnTime: performance.now() });
}

export function applyPowerup(kind: PowerupKind): void {
  const def = POWERUP_DEFS[kind];
  const now = performance.now();
  if (kind === 'nuke') {
    let killed = 0;
    for (const z of zombies) {
      if (z.type === 'boss') {
        z.hp -= z.maxHp * 0.4;
        z.flash = now;
        if (z.hp <= 0) zombieDied(z);
      } else {
        z.hp = 0;
        zombieDied(z);
        killed++;
      }
    }
    showBanner('NUKE!', killed + ' zombies vaporized', 'power');
    triggerShake(16, 300);
  } else if (kind === 'insta') {
    player.instaKillUntil = now + (def.duration || 0);
    showBanner('INSTA-KILL', 'weapons overcharged', 'power');
  } else if (kind === 'double') {
    player.doubleXpUntil = now + (def.duration || 0);
    showBanner('DOUBLE XP', 'xp x2 active', 'power');
  } else if (kind === 'heal') {
    player.hp = player.maxHp;
    showBanner('FULL HEAL', 'wounds patched up', 'power');
    spawnBurst(player.x, player.y, '#8bd17c', 16);
  }
}

export function speedBoostMul(): number { return performance.now() < player.speedBoostUntil ? 1.35 : 1; }
export function damageBoostMul(): number { return performance.now() < player.damageBoostUntil ? 1.5 : 1; }
export function fireRateBoostMul(): number { return performance.now() < player.fireRateBoostUntil ? 1.4 : 1; }
export function regenBoostMul(): number { return performance.now() < player.regenBoostUntil ? 3 : 1; }

export function weaponSpeedMul(mouseDown: boolean): number {
  return (player.weapon === 'machinegun' && mouseDown) ? (WEAPON_DEFS.machinegun.moveSpeedMulWhileFiring || 1) : 1;
}

export function mutationSpeedMul(): number {
  if (player.mutation === 'vampire') return 1.25;
  if (player.mutation === 'titan') return 0.85;
  return 1;
}

export function mutationFireRateMul(): number {
  return player.mutation === 'overclocked' ? 1.5 : 1;
}

export function spawnParticle(x: number, y: number, text: string, color: string): void {
  particles.push({ x, y, text, color, life: 900, maxLife: 900, vy: -0.9 });
}

export function spawnDamageNumber(x: number, y: number, amount: number, color: string): void {
  if (!settings.damageNumbers) return;
  spawnParticle(x, y, '-' + Math.round(amount), color);
}

export function spawnBurst(x: number, y: number, color: string, count: number, shape?: 'circle' | 'casing'): void {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(1, 3.5);
    bursts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 400, maxLife: 400, color, radius: rand(2, 4), shape: shape || 'circle', rot: a
    });
  }
}

export function spawnCasing(x: number, y: number, angle: number): void {
  const perp = angle + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
  bursts.push({
    x, y, vx: Math.cos(perp) * rand(1.5, 3), vy: Math.sin(perp) * rand(1.5, 3) - 1,
    life: 550, maxLife: 550, color: '#d4af37', radius: 3, shape: 'casing', rot: angle + rand(-0.5, 0.5)
  });
}

export function spawnBlood(x: number, y: number, size: number): void {
  bloodDecals.push({ x, y, r: size * rand(0.7, 1.2), rot: rand(0, Math.PI * 2), alpha: rand(0.35, 0.55) });
  if (bloodDecals.length > 160) bloodDecals.shift();
}

export function triggerShake(mag: number, time: number): void {
  if (!settings.screenShake) return;
  if (mag > shake.mag) { shake.mag = mag; shake.time = time; }
}

let xpCallbacks = {
  onWeaponChoice: () => {},
  onMutationChoice: () => {},
  onUpgradePanel: () => {}
};

export function setXpCallbacks(callbacks: {
  onWeaponChoice: () => void;
  onMutationChoice: () => void;
  onUpgradePanel: () => void;
}): void {
  xpCallbacks = callbacks;
}

export function tryShoot(now: number): void {
  if (!player.alive) return;
  if (selectedBuild) return;
  if (player.mutation === 'overclocked' && now < player.overheatedUntil) return;
  const wdef = WEAPON_DEFS[player.weapon];
  const fireRateMul = wdef.fireRateMul * fireRateBoostMul() * mutationFireRateMul();
  if (now - player.lastShot < 1000 / (player.fireRate * fireRateMul)) return;
  player.lastShot = now;

  if (player.mutation === 'overclocked') {
    player.heat += OVERHEAT_PER_SHOT;
    if (player.heat >= OVERHEAT_MAX) {
      player.heat = 0;
      player.overheatedUntil = now + OVERHEAT_LOCKOUT_MS;
      showBanner('OVERHEATED', 'weapon cooling down...', 'power');
    }
  }

  const insta = now < player.instaKillUntil;
  const dmg = insta ? Math.max(player.damage, 500) : player.damage * damageBoostMul() * wdef.damageMul;
  const speed = player.bulletSpeed * (wdef.bulletSpeedMul || 1);
  const life = 1400 * (wdef.bulletLifeMul || 1);
  const willBurn = player.mutation === 'pyromaniac' && Math.random() < BURN_CHANCE;

  function spawnPlayerBullet(angle: number, originOffset: number): void {
    const perpX = Math.cos(angle + Math.PI / 2), perpY = Math.sin(angle + Math.PI / 2);
    const b: Bullet = {
      x: player.x + Math.cos(angle) * (player.radius + 32) + perpX * originOffset,
      y: player.y + Math.sin(angle) * (player.radius + 32) + perpY * originOffset,
      vx: Math.cos(angle) * speed + player.vx * 0.3,
      vy: Math.sin(angle) * speed + player.vy * 0.3,
      radius: player.bulletRadius, damage: dmg,
      life, owner: 'player', insta
    };
    if (wdef.explosive) { b.explosive = true; b.explodeRadius = wdef.explodeRadius; }
    if (willBurn) { b.burn = true; }
    bullets.push(b);
  }

  if (player.weapon === 'dualguns') {
    spawnPlayerBullet(player.angle, -9);
    spawnPlayerBullet(player.angle, 9);
  } else if (player.weapon === 'shotgun') {
    const spread = wdef.spreadRad || 0.2;
    spawnPlayerBullet(player.angle - spread, 0);
    spawnPlayerBullet(player.angle, 0);
    spawnPlayerBullet(player.angle + spread, 0);
  } else {
    spawnPlayerBullet(player.angle, 0);
  }

  spawnCasing(
    player.x + Math.cos(player.angle) * (player.radius + 10) - Math.sin(player.angle) * 4,
    player.y + Math.sin(player.angle) * (player.radius + 10) + Math.cos(player.angle) * 4,
    player.angle
  );
}

export function gainXp(amount: number): void {
  const mul = performance.now() < player.doubleXpUntil ? 2 : 1;
  player.xp += amount * mul;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.statPoints++;
    player.xpToNext = Math.floor(player.xpToNext * 1.32);
    player.maxHp += 8;
    player.hp = Math.min(player.maxHp, player.hp + 8);
    spawnParticle(player.x, player.y - 40, 'LEVEL UP', '#4ecdc4');
  }
  if (player.level >= 15 && !player.weaponChosen) {
    xpCallbacks.onWeaponChoice();
  }
  if (player.level >= 25 && !player.mutationChosen) {
    xpCallbacks.onMutationChoice();
  }
  xpCallbacks.onUpgradePanel();
}

export function zombieDied(z: Zombie): void {
  if (z.dead) return;
  z.dead = true;
  player.kills++;
  registerKill(z.type);
  spawnBurst(z.x, z.y, ZTYPE[z.type].color, z.type === 'boss' ? 40 : 10);
  spawnBlood(z.x, z.y, z.radius);
  awardPoints(POINTS_BY_TYPE[z.type] || 10);
  maybeDropPowerup(z.x, z.y, z.type === 'boss');
  if (z.type === 'boss') {
    gainXp(200 + wave * 10);
    setActiveBoss(null);
    const bossBar = document.getElementById('bossBar');
    if (bossBar) bossBar.classList.remove('show');
    spawnParticle(z.x, z.y - 40, 'BOSS DEFEATED', '#c084fc');
    triggerShake(14, 300);
  } else {
    gainXp(10 + wave * 2);
  }
}
