import { Bullet, Structure, Zombie } from '../types';
import {
  player, bullets, setBullets, zombies, setZombies, resources, setResources,
  structures, setStructures, crates, setCrates, powerups, setPowerups,
  particles, setParticles, bursts, setBursts, bloodDecals, shake, keys, mouse,
  godMode, running, setRunning, meta, wave, playerName, shopOpen, touchMove, touchAim
} from '../state';
import {
  POWERUP_LIFETIME_MS, BURN_DURATION_MS, BURN_DAMAGE_FRACTION,
  OVERHEAT_DECAY_PER_SEC, ZTYPE, STRUCTURE_TIERS, BUILD_DEFS,
  BASE_STATS, WORLD_W, WORLD_H
} from '../constants';
import { clamp, dist, mouseWorldPos, byId } from '../utils';
import {
  speedBoostMul, weaponSpeedMul, mutationSpeedMul, regenBoostMul,
  damageBoostMul, tryShoot, spawnDamageNumber, triggerShake, zombieDied,
  spawnBurst, spawnBlood, applyPowerup, showBanner, spawnParticle, gainXp
} from './combat';
import { saveMeta, submitScore } from './storage';

export function nightMul(dayNightFactor: number): number { return 1 + dayNightFactor * 0.3; }
export function nightDmgMul(dayNightFactor: number): number { return 1 + dayNightFactor * 0.2; }

export function findNearestShop(range: number): Structure | null {
  let best: Structure | null = null, bd = Infinity;
  for (const s of structures) {
    if (s.type !== 'shop') continue;
    const d = dist(player.x, player.y, s.x, s.y);
    if (d < range && d < bd) { best = s; bd = d; }
  }
  return best;
}

export function checkDeath(onKillPlayer: () => void): void {
  if (player.hp > 0) return;
  if (player.secondChance) {
    player.secondChance = false;
    player.hp = Math.round(player.maxHp * 0.5);
    showBanner('SECOND CHANCE', "you're not done yet...", 'power');
    triggerShake(10, 200);
  } else {
    player.hp = 0;
    onKillPlayer();
  }
}

export async function killPlayer(): Promise<void> {
  player.alive = false;
  setRunning(false);
  byId('finalWave').textContent = String(wave);
  byId('finalKills').textContent = String(player.kills);
  byId('finalLevel').textContent = String(player.level);

  const earned = wave * 5 + player.kills + player.level * 2;
  meta.metaPoints += earned;
  meta.lifetimeKills += player.kills;
  meta.bestWave = Math.max(meta.bestWave, wave);
  meta.gamesPlayed += 1;
  meta.name = playerName;
  byId('metaEarned').textContent = '+' + earned + ' meta points earned';
  await saveMeta();
  await submitScore({ name: playerName, wave, kills: player.kills, level: player.level, ts: Date.now() });

  const overlay = byId('overlay');
  overlay.classList.remove('hidden');
  const restartBtn = byId<HTMLButtonElement>('restartBtn');
  if (restartBtn) {
    restartBtn.disabled = true;
    setTimeout(() => { restartBtn.disabled = false; }, 400);
  }
}

export function updatePlayer(dt: number, camera: { x: number; y: number }): void {
  if (!player.alive) return;
  let ax = 0, ay = 0;
  if (keys['w']) ay -= 1;
  if (keys['s']) ay += 1;
  if (keys['a']) ax -= 1;
  if (keys['d']) ax += 1;
  if (touchMove.x !== 0 || touchMove.y !== 0) {
    ax = touchMove.x;
    ay = touchMove.y;
  } else {
    const len = Math.hypot(ax, ay);
    if (len > 0) { ax /= len; ay /= len; }
  }
  const maxSpd = player.maxSpeed * speedBoostMul() * weaponSpeedMul(mouse.down) * mutationSpeedMul();
  const accel = maxSpd * (1 - player.friction) / player.friction * (player.accel / BASE_STATS.accel);
  player.vx += ax * accel;
  player.vy += ay * accel;
  player.vx *= player.friction;
  player.vy *= player.friction;
  const sp = Math.hypot(player.vx, player.vy);
  if (sp > maxSpd) {
    player.vx = player.vx / sp * maxSpd;
    player.vy = player.vy / sp * maxSpd;
  }
  player.x = clamp(player.x + player.vx, player.radius, WORLD_W - player.radius);
  player.y = clamp(player.y + player.vy, player.radius, WORLD_H - player.radius);

  if (touchAim.x !== 0 || touchAim.y !== 0) {
    player.angle = Math.atan2(touchAim.y, touchAim.x);
  } else {
    const mWorld = mouseWorldPos(mouse, camera);
    player.angle = Math.atan2(mWorld.y - player.y, mWorld.x - player.x);
  }

  if (mouse.down) tryShoot(performance.now());

  if (player.mutation === 'overclocked' && player.heat > 0) {
    player.heat = Math.max(0, player.heat - OVERHEAT_DECAY_PER_SEC * dt / 1000);
  }

  player.hp = Math.min(player.maxHp, player.hp + player.regen * regenBoostMul() * dt);

  for (const r of resources) {
    const d = dist(player.x, player.y, r.x, r.y);
    const minD = player.radius + r.radius;
    if (d < minD) {
      const overlap = minD - d;
      const angle = d > 0.001 ? Math.atan2(player.y - r.y, player.x - r.x) : Math.random() * Math.PI * 2;
      player.x += Math.cos(angle) * overlap * 0.5;
      player.y += Math.sin(angle) * overlap * 0.5;
    }
  }
  for (const s of structures) {
    const d = dist(player.x, player.y, s.x, s.y);
    const minD = player.radius + s.radius;
    if (d < minD) {
      const overlap = minD - d;
      const angle = d > 0.001 ? Math.atan2(player.y - s.y, player.x - s.x) : Math.random() * Math.PI * 2;
      player.x += Math.cos(angle) * overlap * 0.5;
      player.y += Math.sin(angle) * overlap * 0.5;
    }
  }
  for (const c of crates) {
    if (dist(player.x, player.y, c.x, c.y) < player.radius + c.radius) {
      c.dead = true;
      const roll = Math.random();
      if (roll < 0.4) {
        const amt = Math.round((15 + Math.random() * 10) * (player.resourceMul || 1));
        player.wood += amt;
        spawnParticle(c.x, c.y, '+' + amt + ' wood', '#c98b4a');
      } else if (roll < 0.75) {
        const amt = Math.round((10 + Math.random() * 8) * (player.resourceMul || 1));
        player.stone += amt;
        spawnParticle(c.x, c.y, '+' + amt + ' stone', '#9aa7ac');
      } else {
        const amt = 25;
        player.hp = Math.min(player.maxHp, player.hp + amt);
        spawnParticle(c.x, c.y, '+' + amt + ' hp', '#8bd17c');
      }
      spawnBurst(c.x, c.y, '#ffd76a', 8);
    }
  }
  setCrates(crates.filter(c => !c.dead));

  const powerupNow = performance.now();
  for (const p of powerups) {
    if (dist(player.x, player.y, p.x, p.y) < player.radius + p.radius) {
      p.dead = true;
      applyPowerup(p.kind);
    } else if (powerupNow - p.spawnTime > POWERUP_LIFETIME_MS) {
      p.dead = true;
    }
  }
  setPowerups(powerups.filter(p => !p.dead));
}

export function explodeBullet(b: Bullet): void {
  const radius = b.explodeRadius || 90;
  for (const z of zombies) {
    const d = dist(b.x, b.y, z.x, z.y);
    if (d < radius + z.radius) {
      const falloff = 1 - (d / (radius + z.radius)) * 0.4;
      const dealt = b.damage * falloff;
      z.hp -= dealt;
      z.flash = performance.now();
      if (b.owner === 'player' && player.mutation === 'vampire') {
        player.hp = Math.min(player.maxHp, player.hp + dealt * 0.02);
      }
      if (z.hp <= 0) zombieDied(z); else spawnBlood(z.x, z.y, z.radius * 0.4);
    }
  }
  spawnBurst(b.x, b.y, '#ffb347', 26);
  triggerShake(10, 220);
}

export function updateBullets(dt: number): void {
  bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life -= dt; });
  setBullets(bullets.filter(b => b.life > 0 && b.x > 0 && b.x < WORLD_W && b.y > 0 && b.y < WORLD_H));

  for (const b of bullets) {
    if (b.owner === 'zombie') {
      for (const s of structures) {
        if (dist(b.x, b.y, s.x, s.y) < b.radius + s.radius) { b.dead = true; break; }
      }
      if (b.dead) continue;
      if (player.alive && dist(b.x, b.y, player.x, player.y) < b.radius + player.radius) {
        if (!godMode) player.hp -= b.damage;
        spawnDamageNumber(player.x, player.y - 30, b.damage, '#8be36b');
        triggerShake(4, 100);
        b.dead = true;
        checkDeath(killPlayer);
      }
      continue;
    }
    for (const z of zombies) {
      if (b.dead) break;
      if (dist(b.x, b.y, z.x, z.y) < b.radius + z.radius) {
        if (b.explosive) {
          explodeBullet(b);
        } else {
          z.hp -= b.damage;
          z.flash = performance.now();
          spawnDamageNumber(z.x, z.y - 20, b.damage, '#ff8080');
          if (b.owner === 'player' && player.mutation === 'vampire') {
            player.hp = Math.min(player.maxHp, player.hp + b.damage * 0.02);
          }
          if (b.owner === 'player' && b.burn) {
            z.burnUntil = performance.now() + BURN_DURATION_MS;
            z.burnDamagePerSec = b.damage * BURN_DAMAGE_FRACTION;
          }
          if (z.hp <= 0) zombieDied(z);
          else if (Math.random() < 0.4) spawnBlood(z.x, z.y, z.radius * 0.5);
        }
        b.dead = true;
        break;
      }
    }
    if (b.dead) continue;
    if (b.owner === 'player') {
      for (const r of resources) {
        if (dist(b.x, b.y, r.x, r.y) < b.radius + r.radius) {
          r.hp -= b.damage;
          b.dead = true;
          if (r.hp <= 0) {
            r.dead = true;
            spawnBurst(r.x, r.y, r.type === 'tree' ? '#356b43' : '#8b9599', 8);
            if (r.type === 'tree') {
              const amt = Math.round((8 + Math.random() * 6) * (player.resourceMul || 1));
              player.wood += amt;
              spawnParticle(r.x, r.y, '+' + amt + ' wood', '#c98b4a');
              gainXp(Math.round(3 * (player.resourceMul || 1)));
            } else {
              const amt = Math.round((6 + Math.random() * 4) * (player.resourceMul || 1));
              player.stone += amt;
              spawnParticle(r.x, r.y, '+' + amt + ' stone', '#9aa7ac');
              gainXp(Math.round(3 * (player.resourceMul || 1)));
            }
          }
          break;
        }
      }
    }
  }
  setBullets(bullets.filter(b => !b.dead));
  setResources(resources.filter(r => !r.dead));
  setZombies(zombies.filter(z => !z.dead));
}

export function updateStructures(dt: number): void {
  const now = performance.now();
  for (const s of structures) {
    if (s.type === 'turret') {
      if (!s.lastShot) s.lastShot = 0;
      let nearest = null, nd = Infinity;
      for (const z of zombies) { const d = dist(s.x, s.y, z.x, z.y); if (d < (s.range || 0) && d < nd) { nd = d; nearest = z; } }
      if (nearest) {
        s.aimAngle = Math.atan2(nearest.y - s.y, nearest.x - s.x);
        if (now - s.lastShot > 1000 / (s.fireRate || 1)) {
          s.lastShot = now;
          const a = s.aimAngle;
          bullets.push({
            x: s.x + Math.cos(a) * (s.radius + 4), y: s.y + Math.sin(a) * (s.radius + 4),
            vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, radius: 4, damage: s.damage || 9,
            life: 1200, owner: 'turret'
          });
        }
      }
    }
    if (s.type === 'campfire') {
      if (dist(player.x, player.y, s.x, s.y) < (s.healRadius || 150)) {
        player.hp = Math.min(player.maxHp, player.hp + (s.healRate || 5) * dt / 1000);
      }
    }
    if (s.type === 'spike') {
      for (const z of zombies) {
        if (dist(s.x, s.y, z.x, z.y) < s.radius + z.radius) {
          if (!z.spikeCd || now - z.spikeCd > 500) {
            z.hp -= s.damage || 9; z.spikeCd = now; z.flash = now;
            if (z.hp <= 0) zombieDied(z);
          }
        }
      }
    }
  }
  setZombies(zombies.filter(z => !z.dead));
  setStructures(structures.filter(s => s.hp > 0));
}

export function updateZombies(dt: number, dayNightFactor: number): void {
  const now = performance.now();
  const speedM = nightMul(dayNightFactor), dmgM = nightDmgMul(dayNightFactor);
  for (const z of zombies) {
    const def = ZTYPE[z.type];

    if (z.burnUntil && now < z.burnUntil) {
      const burnDmg = (z.burnDamagePerSec || 0) * dt / 1000;
      z.hp -= burnDmg;
      if (Math.random() < 0.1) spawnDamageNumber(z.x, z.y - 10, burnDmg * 10, '#ff6a3a');
      if (z.hp <= 0) { zombieDied(z); continue; }
    }

    if (def.explode && z.fuseStart) {
      if (now - z.fuseStart > 650) {
        const dmg = (z.explodeDamage || 16) * dmgM;
        if (player.alive && dist(z.x, z.y, player.x, player.y) < (def.explodeRadius || 95) + player.radius) {
          if (!godMode) player.hp -= dmg;
          spawnDamageNumber(player.x, player.y - 30, dmg, '#ff9f43');
          checkDeath(killPlayer);
        }
        for (const s of structures) { if (dist(z.x, z.y, s.x, s.y) < (def.explodeRadius || 95) + s.radius) s.hp -= dmg * 0.6; }
        spawnBurst(z.x, z.y, '#ffb347', 24);
        triggerShake(10, 220);
        zombieDied(z);
      }
      continue;
    }

    if (def.ranged) {
      const d = dist(z.x, z.y, player.x, player.y);
      if (d > (def.range || 340)) {
        const a = Math.atan2(player.y - z.y, player.x - z.x);
        z.x += Math.cos(a) * z.speed * speedM;
        z.y += Math.sin(a) * z.speed * speedM;
      } else if (d < (def.range || 340) * 0.55) {
        const a = Math.atan2(z.y - player.y, z.x - player.x);
        z.x += Math.cos(a) * z.speed * speedM;
        z.y += Math.sin(a) * z.speed * speedM;
      }
      if (now - z.lastShot > 1000 / (def.fireRate || 0.8)) {
        z.lastShot = now;
        const a = Math.atan2(player.y - z.y, player.x - z.x);
        bullets.push({
          x: z.x + Math.cos(a) * (z.radius + 6), y: z.y + Math.sin(a) * (z.radius + 6),
          vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, radius: 5,
          damage: (z.projDamage || 6) * dmgM, life: 2200, owner: 'zombie'
        });
      }
      z.x = clamp(z.x, z.radius, WORLD_W - z.radius);
      z.y = clamp(z.y, z.radius, WORLD_H - z.radius);
      continue;
    }

    let blocked = null;
    for (const s of structures) {
      if (dist(z.x, z.y, s.x, s.y) < s.radius + z.radius + 6) { blocked = s; break; }
    }
    let dx: number, dy: number;
    if (blocked) {
      blocked.hp -= (z.type === 'brute' ? 24 : 14) * dt / 1000;
      const d = dist(z.x, z.y, blocked.x, blocked.y) || 1;
      dx = (z.x - blocked.x) / d; dy = (z.y - blocked.y) / d;
      z.x += dx * 0.6; z.y += dy * 0.6;
    } else {
      const d = dist(z.x, z.y, player.x, player.y) || 1;
      dx = (player.x - z.x) / d; dy = (player.y - z.y) / d;
      z.wobble += dt * 0.004;
      const wob = z.type === 'boss' ? 0 : Math.sin(z.wobble) * 0.25;
      z.x += (dx + -dy * wob) * z.speed * speedM;
      z.y += (dy + dx * wob) * z.speed * speedM;
    }
    z.x = clamp(z.x, z.radius, WORLD_W - z.radius);
    z.y = clamp(z.y, z.radius, WORLD_H - z.radius);

    if (def.explode && !z.fuseStart) {
      const d = dist(z.x, z.y, player.x, player.y);
      if (d < z.radius + player.radius + 16) z.fuseStart = now;
    }

    if (player.alive) {
      const d = dist(z.x, z.y, player.x, player.y);
      if (d < z.radius + player.radius) {
        const cd = z.type === 'boss' ? 800 : 550;
        if (now - (z.hitCooldown || 0) > cd) {
          const dmg = z.damage * dmgM;
          if (!godMode) player.hp -= dmg;
          z.hitCooldown = now;
          const pushD = d || 1;
          player.x += (player.x - z.x) / pushD * (z.type === 'boss' ? 18 : 10);
          player.y += (player.y - z.y) / pushD * (z.type === 'boss' ? 18 : 10);
          spawnDamageNumber(player.x, player.y - 30, dmg, '#ff4d4d');
          triggerShake(z.type === 'boss' ? 12 : 6, z.type === 'boss' ? 250 : 150);
          checkDeath(killPlayer);
        }
      }
    }
  }
}

export function updateParticles(dt: number): void {
  particles.forEach(p => { p.y += p.vy; p.life -= dt; });
  setParticles(particles.filter(p => p.life > 0));
  bursts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; });
  setBursts(bursts.filter(p => p.life > 0));
  if (shake.time > 0) shake.time -= dt; else shake.mag = 0;
}
