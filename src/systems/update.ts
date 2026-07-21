import { Bullet, Structure, Zombie } from '../types';
import {
  player, bullets, setBullets, zombies, setZombies, resources, setResources,
  structures, setStructures, crates, setCrates, powerups, setPowerups,
  particles, setParticles, bursts, setBursts, bloodDecals, shake, keys, mouse,
  godMode, running, setRunning, meta, wave, playerName, shopOpen, touchMove, touchAim,
  fireZones, setFireZones, toxicClouds, setToxicClouds,
  teslaChains, setTeslaChains, sniperLasers, setSniperLasers
} from '../state';
import {
  POWERUP_LIFETIME_MS, BURN_DURATION_MS, BURN_DAMAGE_FRACTION,
  OVERHEAT_DECAY_PER_SEC, ZTYPE, STRUCTURE_TIERS, BUILD_DEFS,
  BASE_STATS, WORLD_W, WORLD_H, TOWER_LEVELS
} from '../constants';
import { clamp, dist, mouseWorldPos, byId, rand } from '../utils';
import {
  speedBoostMul, weaponSpeedMul, mutationSpeedMul, regenBoostMul,
  damageBoostMul, tryShoot, spawnDamageNumber, triggerShake, zombieDied,
  spawnBurst, spawnBlood, applyPowerup, showBanner, spawnParticle, gainXp
} from './combat';
import { saveMeta, submitScore } from './storage';
import { spawnZombie } from './wave';

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
  const slowMul = (player.slowedUntil && performance.now() < player.slowedUntil) ? 0.55 : 1.0;
  const maxSpd = player.maxSpeed * speedBoostMul() * weaponSpeedMul(mouse.down) * mutationSpeedMul() * slowMul;
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
      
      // Independent iron/gold drop from crates
      if (Math.random() < 0.35) {
        const ironAmt = Math.round((2 + Math.floor(Math.random() * 4)) * (player.resourceMul || 1));
        player.iron += ironAmt;
        setTimeout(() => spawnParticle(c.x, c.y - 15, '+' + ironAmt + ' iron', '#708090'), 150);
      }
      if (Math.random() < 0.15) {
        const goldAmt = Math.round((1 + Math.floor(Math.random() * 2)) * (player.resourceMul || 1));
        player.gold += goldAmt;
        setTimeout(() => spawnParticle(c.x, c.y - 30, '+' + goldAmt + ' gold', '#ffd76a'), 300);
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
      let dealt = b.damage;
      if (b.isMortar && b.mortarLevel && b.mortarLevel >= 3 && d < 55) {
        dealt *= (b.mortarLevel === 3 ? 1.4 : 1.8);
      } else {
        const falloff = 1 - (d / (radius + z.radius)) * 0.4;
        dealt *= falloff;
      }
      
      const vuln = 1 + (z.dmgVulnerability || 0);
      const physVuln = 1 + (z.physVulnerability || 0);
      let finalDmg = dealt * vuln;
      if (b.owner === 'player' || b.owner === 'turret') {
        finalDmg *= physVuln;
      }
      const reducedArmor = Math.max(0, z.armor - (z.armorReduction || 0));
      const armorPen = b.armorPenetration ? reducedArmor * b.armorPenetration : 0;
      const netArmor = Math.max(0, reducedArmor - armorPen);
      finalDmg = Math.max(1, finalDmg - netArmor);

      z.hp -= finalDmg;
      z.flash = performance.now();
      if (b.owner === 'player' && player.mutation === 'vampire') {
        player.hp = Math.min(player.maxHp, player.hp + finalDmg * 0.02);
      }
      if (z.hp <= 0) zombieDied(z); else spawnBlood(z.x, z.y, z.radius * 0.4);
    }
  }

  if (b.isMortar && b.mortarLevel === 5) {
    fireZones.push({
      x: b.x, y: b.y, radius: 90, damagePerSec: 30, endsAt: performance.now() + 3000
    });
  }

  if (b.isToxic) {
    toxicClouds.push({
      x: b.x, y: b.y, radius: b.toxicRadius || 150, damagePerSec: b.toxicDmg || 10,
      armorReduction: b.armorReduction || 5, dmgVulnerability: b.dmgVulnerability || 0,
      endsAt: performance.now() + 4000
    });
  }

  spawnBurst(b.x, b.y, b.isToxic ? '#59b37a' : '#ffb347', b.isToxic ? 14 : 26);
  triggerShake(b.isToxic ? 4 : 10, 220);
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
        spawnDamageNumber(player.x, player.y - 30, b.damage, b.slowProj ? '#bbd8f2' : '#8be36b');
        if (b.slowProj) {
          player.slowedUntil = performance.now() + 3000;
          spawnParticle(player.x, player.y - 45, 'SLOWED', '#5b9ad6');
        }
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
          const vuln = 1 + (z.dmgVulnerability || 0);
          const physVuln = 1 + (z.physVulnerability || 0);
          let finalDmg = b.damage * vuln;
          if (b.owner === 'player' || b.owner === 'turret') {
            finalDmg *= physVuln;
          }
          const reducedArmor = Math.max(0, z.armor - (z.armorReduction || 0));
          const armorPen = b.armorPenetration ? reducedArmor * b.armorPenetration : 0;
          const netArmor = Math.max(0, reducedArmor - armorPen);
          finalDmg = Math.max(1, finalDmg - netArmor);

          z.hp -= finalDmg;
          z.flash = performance.now();
          spawnDamageNumber(z.x, z.y - 20, Math.round(finalDmg), b.owner === 'turret' ? '#f08080' : '#ff8080');
          
          if (b.owner === 'turret' && b.armorPenetration === 0.5) {
            const pushDir = Math.atan2(z.y - b.y, z.x - b.x);
            z.x = clamp(z.x + Math.cos(pushDir) * 16, z.radius, WORLD_W - z.radius);
            z.y = clamp(z.y + Math.sin(pushDir) * 16, z.radius, WORLD_H - z.radius);
          }

          if (b.owner === 'player' && player.mutation === 'vampire') {
            player.hp = Math.min(player.maxHp, player.hp + finalDmg * 0.02);
          }
          if (b.owner === 'player' && b.burn) {
            z.burnUntil = performance.now() + BURN_DURATION_MS;
            z.burnDamagePerSec = b.damage * BURN_DAMAGE_FRACTION;
          }
          if (z.hp <= 0) zombieDied(z);
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
              
              // 25% chance to get 1-3 Iron
              if (Math.random() < 0.25) {
                const ironAmt = Math.round((1 + Math.floor(Math.random() * 3)) * (player.resourceMul || 1));
                player.iron += ironAmt;
                setTimeout(() => spawnParticle(r.x, r.y - 15, '+' + ironAmt + ' iron', '#708090'), 150);
              }
              // 8% chance to get 1 Gold
              if (Math.random() < 0.08) {
                const goldAmt = 1;
                player.gold += goldAmt;
                setTimeout(() => spawnParticle(r.x, r.y - 30, '+' + goldAmt + ' gold', '#ffd76a'), 300);
              }

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

  // Reset frame-based debuff accumulators on all zombies
  for (const z of zombies) {
    z.armorReduction = 0;
    z.dmgVulnerability = 0;
    z.slowAmount = 0;
    z.physVulnerability = 0;
  }

  // Update Fire Zones
  const activeFireZones = fireZones.filter(fz => now < fz.endsAt);
  for (const fz of activeFireZones) {
    const dmg = fz.damagePerSec * dt / 1000;
    for (const z of zombies) {
      if (z.dead) continue;
      if (dist(fz.x, fz.y, z.x, z.y) < fz.radius + z.radius) {
        z.hp -= dmg;
        z.flash = now;
        if (z.hp <= 0) zombieDied(z);
      }
    }
  }
  setFireZones(activeFireZones);

  // Update Toxic Clouds
  const activeToxicClouds = toxicClouds.filter(tc => now < tc.endsAt);
  for (const tc of activeToxicClouds) {
    const dmg = tc.damagePerSec * dt / 1000;
    for (const z of zombies) {
      if (z.dead) continue;
      if (dist(tc.x, tc.y, z.x, z.y) < tc.radius + z.radius) {
        z.hp -= dmg;
        z.flash = now;
        z.armorReduction = Math.max(z.armorReduction || 0, tc.armorReduction);
        z.dmgVulnerability = Math.max(z.dmgVulnerability || 0, tc.dmgVulnerability);
        z.toxicUntil = now + 500;
        if (z.hp <= 0) {
          zombieDied(z);
          // Lv.5 Toxic Spitter: spawn small toxic cloud on death
          if (tc.armorReduction === 25) { // Lv 5 has armorReduction = 25
            toxicClouds.push({
              x: z.x, y: z.y, radius: 75, damagePerSec: 12, armorReduction: 10, dmgVulnerability: 0.10, endsAt: now + 2000
            });
          }
        }
      }
    }
  }
  setToxicClouds(activeToxicClouds);

  // Update visual lightning / lasers lifespans
  setTeslaChains(teslaChains.filter((tc: any) => now < tc.endsAt));
  setSniperLasers(sniperLasers.filter((sl: any) => now < sl.endsAt));

  for (const s of structures) {
    if (s.type === 'campfire') {
      if (dist(player.x, player.y, s.x, s.y) < (s.healRadius || 150)) {
        player.hp = Math.min(player.maxHp, player.hp + (s.healRate || 5) * dt / 1000);
      }
    }
    if (s.type === 'spike') {
      for (const z of zombies) {
        if (dist(s.x, s.y, z.x, z.y) < s.radius + z.radius) {
          if (!z.spikeCd || now - z.spikeCd > 500) {
            // Apply vulnerability and armor
            const reducedArmor = Math.max(0, z.armor - (z.armorReduction || 0));
            const vuln = 1 + (z.dmgVulnerability || 0);
            const physVuln = 1 + (z.physVulnerability || 0);
            let finalDmg = (s.damage || 9) * vuln * physVuln;
            finalDmg = Math.max(1, finalDmg - reducedArmor);

            z.hp -= finalDmg; z.spikeCd = now; z.flash = now;
            if (z.hp <= 0) zombieDied(z);
          }
        }
      }
    }

    // Cannon Tower
    if (s.type === 'cannon') {
      const lvl = s.level || 1;
      const spec = TOWER_LEVELS.cannon[lvl - 1];
      if (!s.lastShot) s.lastShot = 0;
      
      let target: Zombie | null = null, bestDist = Infinity;
      for (const z of zombies) {
        if (z.dead) continue;
        const d = dist(s.x, s.y, z.x, z.y);
        if (d < spec.range) {
          const dPlayer = dist(z.x, z.y, player.x, player.y);
          if (dPlayer < bestDist) { target = z; bestDist = dPlayer; }
        }
      }
      
      if (target) {
        s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
        let speedup = 1.0;
        if (lvl >= 3) {
          if (s.lastTargetId !== target.id) {
            s.consecutiveHits = 0;
          }
          const maxBoost = lvl === 3 ? 0.30 : 0.50;
          speedup = 1 + Math.min(maxBoost, (s.consecutiveHits || 0) * 0.05);
        }
        
        const cooldown = 1000 / (spec.fireRate * speedup);
        if (now - s.lastShot > cooldown) {
          s.lastShot = now;
          if (lvl >= 3) {
            s.lastTargetId = target.id;
            s.consecutiveHits = (s.consecutiveHits || 0) + 1;
          }
          const a = s.aimAngle;
          const b: Bullet = {
            x: s.x + Math.cos(a) * (s.radius + 4), y: s.y + Math.sin(a) * (s.radius + 4),
            vx: Math.cos(a) * 8.5, vy: Math.sin(a) * 8.5, radius: 4, damage: spec.damage,
            life: 1200, owner: 'turret'
          };
          if (lvl === 5) {
            b.armorPenetration = 0.5;
          }
          bullets.push(b);
        }
      }
    }

    // Mortar Tower
    if (s.type === 'mortar') {
      const lvl = s.level || 1;
      const spec = TOWER_LEVELS.mortar[lvl - 1];
      if (!s.lastShot) s.lastShot = 0;
      
      let target: Zombie | null = null, bestDensity = -1;
      for (const z of zombies) {
        if (z.dead) continue;
        const d = dist(s.x, s.y, z.x, z.y);
        if (d >= 120 && d < spec.range) {
          let density = 0;
          for (const other of zombies) {
            if (other !== z && !other.dead && dist(z.x, z.y, other.x, other.y) < 120) {
              density++;
            }
          }
          if (density > bestDensity) { target = z; bestDensity = density; }
        }
      }
      
      if (target && now - s.lastShot > 1000 / spec.fireRate) {
        s.lastShot = now;
        s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
        const a = s.aimAngle;
        bullets.push({
          x: s.x + Math.cos(a) * (s.radius + 4), y: s.y + Math.sin(a) * (s.radius + 4),
          vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, radius: 6, damage: spec.damage,
          life: 1800, owner: 'turret', explosive: true, explodeRadius: spec.specialValue || 125,
          isMortar: true, mortarLevel: lvl
        });
      }
    }

    // Tesla Tower
    if (s.type === 'tesla') {
      const lvl = s.level || 1;
      const spec = TOWER_LEVELS.tesla[lvl - 1];
      if (!s.lastShot) s.lastShot = 0;
      
      let target: Zombie | null = null, bestD = Infinity;
      for (const z of zombies) {
        if (z.dead) continue;
        const d = dist(s.x, s.y, z.x, z.y);
        if (d < spec.range && d < bestD) { target = z; bestD = d; }
      }
      
      if (target && now - s.lastShot > 1000 / spec.fireRate) {
        s.lastShot = now;
        s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
        
        const maxChains = spec.specialValue || 3;
        const damageReduction = lvl === 3 ? 0.08 : (lvl >= 4 ? 0.05 : 0.15);
        let current: Zombie | null = target;
        let chainDmg = spec.damage;
        const hitSet = new Set<number>();
        const segments: { sx: number; sy: number; tx: number; ty: number }[] = [];
        let sx = s.x, sy = s.y;

        for (let c = 0; c < maxChains; c++) {
          if (!current) break;
          hitSet.add(current.id);
          
          const reducedArmor = Math.max(0, current.armor - (current.armorReduction || 0));
          const vuln = 1 + (current.dmgVulnerability || 0);
          const finalDmg = Math.max(1, chainDmg * vuln - reducedArmor);
          current.hp -= finalDmg;
          current.flash = now;
          
          if (lvl === 5 && Math.random() < 0.20) {
            current.stunUntil = now + 1000;
            spawnParticle(current.x, current.y - 20, 'SHOCK', '#89cff0');
          }
          if (current.hp <= 0) zombieDied(current);
          
          segments.push({ sx, sy, tx: current.x, ty: current.y });
          
          let next: Zombie | null = null, nextBestD = Infinity;
          for (const z of zombies) {
            if (z.dead || hitSet.has(z.id)) continue;
            const dNext = dist(current.x, current.y, z.x, z.y);
            if (dNext < 160 && dNext < nextBestD) { next = z; nextBestD = dNext; }
          }
          sx = current.x; sy = current.y;
          current = next;
          chainDmg *= (1 - damageReduction);
        }
        teslaChains.push({ segments, endsAt: now + 100 });
      }
    }

    // Sniper Tower
    if (s.type === 'sniper') {
      const lvl = s.level || 1;
      const spec = TOWER_LEVELS.sniper[lvl - 1];
      if (!s.lastShot) s.lastShot = 0;
      
      let target: Zombie | null = null, highestHp = -1;
      for (const z of zombies) {
        if (z.dead) continue;
        const d = dist(s.x, s.y, z.x, z.y);
        if (d < spec.range && z.hp > highestHp) { target = z; highestHp = z.hp; }
      }
      
      if (target && now - s.lastShot > 1000 / spec.fireRate) {
        s.lastShot = now;
        s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
        
        let damage = spec.damage;
        let isCrit = false;
        if (lvl >= 3) {
          const reqHpPct = lvl === 3 ? 0.70 : 0.50;
          if (target.hp >= target.maxHp * reqHpPct) {
            damage *= 2;
            isCrit = true;
          }
        }
        if (lvl === 5) {
          if (target.type === 'boss') {
            damage *= 4.0;
          } else if (target.hp <= target.maxHp * 0.18) {
            damage = target.hp + 9999;
            isCrit = true;
          }
        }
        
        const reducedArmor = Math.max(0, target.armor - (target.armorReduction || 0));
        const vuln = 1 + (target.dmgVulnerability || 0);
        const finalDmg = Math.max(1, damage * vuln - reducedArmor);
        target.hp -= finalDmg;
        target.flash = now;
        
        spawnDamageNumber(target.x, target.y - 20, Math.round(finalDmg), isCrit ? '#ffd76a' : '#ff5c5c');
        if (isCrit) {
          spawnParticle(target.x, target.y - 35, 'CRIT', '#ffd76a');
        }
        if (target.hp <= 0) zombieDied(target);
        
        sniperLasers.push({ sx: s.x, sy: s.y, tx: target.x, ty: target.y, endsAt: now + 150 });
      }
    }

    // Frost Tower
    if (s.type === 'frost') {
      const lvl = s.level || 1;
      const spec = TOWER_LEVELS.frost[lvl - 1];
      const slowAmt = spec.specialValue || 0.20;
      const dmg = spec.damage * dt / 1000;
      
      for (const z of zombies) {
        if (z.dead) continue;
        const d = dist(s.x, s.y, z.x, z.y);
        if (d < spec.range) {
          z.hp -= dmg;
          z.flash = now;
          if (z.hp <= 0) { zombieDied(z); continue; }
          
          z.slowedUntil = now + 300;
          z.slowAmount = Math.max(z.slowAmount || 0, slowAmt);
          
          if (lvl >= 3) {
            z.physVulnerability = Math.max(z.physVulnerability || 0, lvl === 3 ? 0.10 : 0.20);
          }
          if (lvl === 5) {
            z.frozenTime = (z.frozenTime || 0) + dt;
            if (z.frozenTime >= 4000) {
              z.stunUntil = now + 2000;
              z.frozenTime = 0;
              spawnParticle(z.x, z.y - 25, 'FROZEN', '#5b9ad6');
            }
          }
        } else {
          if (z.frozenTime) z.frozenTime = Math.max(0, z.frozenTime - dt * 0.5);
        }
      }
    }

    // Toxic Spitter
    if (s.type === 'toxic') {
      const lvl = s.level || 1;
      const spec = TOWER_LEVELS.toxic[lvl - 1];
      if (!s.lastShot) s.lastShot = 0;
      
      let target: Zombie | null = null, bestDensity = -1;
      for (const z of zombies) {
        if (z.dead) continue;
        const d = dist(s.x, s.y, z.x, z.y);
        if (d < spec.range) {
          let density = 0;
          for (const other of zombies) {
            if (other !== z && !other.dead && dist(z.x, z.y, other.x, other.y) < 120) {
              density++;
            }
          }
          if (density > bestDensity) { target = z; bestDensity = density; }
        }
      }
      
      if (target && now - s.lastShot > 1000 / spec.fireRate) {
        s.lastShot = now;
        s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
        const a = s.aimAngle;
        const vuln = lvl === 3 ? 0.15 : (lvl >= 4 ? 0.25 : 0.0);
        bullets.push({
          x: s.x + Math.cos(a) * (s.radius + 4), y: s.y + Math.sin(a) * (s.radius + 4),
          vx: Math.cos(a) * 5.0, vy: Math.sin(a) * 5.0, radius: 5, damage: 0,
          life: 1800, owner: 'turret', explosive: true, explodeRadius: 10,
          isToxic: true, toxicRadius: 150 + (lvl - 1) * 15, toxicDmg: spec.damage,
          armorReduction: spec.specialValue || 5, dmgVulnerability: vuln
        });
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

    let slowMul = 1.0;
    if (z.slowedUntil && now < z.slowedUntil) {
      slowMul = Math.max(0.1, 1 - (z.slowAmount || 0.20));
    }
    if (z.stunUntil && now < z.stunUntil) {
      slowMul = 0;
    }

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
      let speedFactor = 1.0;
      
      let overlappingStructure = false;
      if (z.type === 'spider') {
        for (const s of structures) {
          if (dist(z.x, z.y, s.x, s.y) < s.radius + z.radius) {
            overlappingStructure = true;
            break;
          }
        }
      }
      if (overlappingStructure) {
        speedFactor = 0.45;
      } else if (z.type !== 'spider') {
        let hitStr = null;
        for (const s of structures) {
          if (dist(z.x, z.y, s.x, s.y) < s.radius + z.radius + 6) { hitStr = s; break; }
        }
        if (hitStr) {
          hitStr.hp -= (z.type === 'brute' ? 24 : 14) * dt / 1000;
          const sd = dist(z.x, z.y, hitStr.x, hitStr.y) || 1;
          z.x += (z.x - hitStr.x) / sd * 0.6;
          z.y += (z.y - hitStr.y) / sd * 0.6;
          speedFactor = 0;
        }
      }
      
      if (speedFactor > 0) {
        let dx = 0, dy = 0;
        if (d > (def.range || 340)) {
          const a = Math.atan2(player.y - z.y, player.x - z.x);
          dx = Math.cos(a);
          dy = Math.sin(a);
        } else if (d < (def.range || 340) * 0.55) {
          const a = Math.atan2(z.y - player.y, z.x - player.x);
          dx = Math.cos(a);
          dy = Math.sin(a);
        }
        
        let witchBuff = 1.0;
        if (z.type !== 'witch' && z.type !== 'boss') {
          const witchNearby = zombies.some(other => other.type === 'witch' && !other.dead && dist(z.x, z.y, other.x, other.y) < 160);
          if (witchNearby) witchBuff = 1.35;
        }

        z.wobble += dt * 0.004;
        const wob = Math.sin(z.wobble) * 0.25;
        z.x += (dx + -dy * wob) * z.speed * speedM * speedFactor * witchBuff * slowMul;
        z.y += (dy + dx * wob) * z.speed * speedM * speedFactor * witchBuff * slowMul;
      }
      
      if (z.type === 'witch') {
        if (!z.lastSummon) z.lastSummon = 0;
        if (now - z.lastSummon > 6000) {
          z.lastSummon = now;
          const typeToSummon = Math.random() < 0.65 ? 'normal' : 'scout';
          const offAngle = Math.random() * Math.PI * 2;
          const offD = rand(40, 90);
          const sx = clamp(z.x + Math.cos(offAngle) * offD, 40, WORLD_W - 40);
          const sy = clamp(z.y + Math.sin(offAngle) * offD, 40, WORLD_H - 40);
          spawnZombie(typeToSummon, sx, sy);
          spawnBurst(sx, sy, '#8e44ad', 8);
          spawnParticle(z.x, z.y - 30, 'SUMMON', '#bdc3c7');
        }
      }

      if (now - z.lastShot > 1000 / (def.fireRate || 0.8)) {
        z.lastShot = now;
        const a = Math.atan2(player.y - z.y, player.x - z.x);
        
        const isSpider = z.type === 'spider';
        const isWitch = z.type === 'witch';
        let bRad = 5, bDmg = (z.projDamage || 6) * dmgM, bSpeed = 5.5, bLife = 2200, slowProj = false;
        if (isSpider) {
          bRad = 6;
          bDmg = 2 * dmgM;
          bSpeed = 6.5;
          bLife = 1500;
          slowProj = true;
        } else if (isWitch) {
          bRad = 8;
          bDmg = 10 * dmgM;
          bSpeed = 4.0;
          bLife = 2500;
        }
        
        bullets.push({
          x: z.x + Math.cos(a) * (z.radius + 6), y: z.y + Math.sin(a) * (z.radius + 6),
          vx: Math.cos(a) * bSpeed, vy: Math.sin(a) * bSpeed, radius: bRad,
          damage: bDmg, life: bLife, owner: 'zombie', slowProj
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
      
      let witchBuff = 1.0;
      if (z.type !== 'witch' && z.type !== 'boss') {
        const witchNearby = zombies.some(other => other.type === 'witch' && !other.dead && dist(z.x, z.y, other.x, other.y) < 160);
        if (witchNearby) witchBuff = 1.35;
      }

      z.x += (dx + -dy * wob) * z.speed * speedM * witchBuff * slowMul;
      z.y += (dy + dx * wob) * z.speed * speedM * witchBuff * slowMul;
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

  // Player-to-Zombie Soft Separation Physics (Prevents Player and Zombie overlapping)
  if (player.alive) {
    for (const z of zombies) {
      if (z.dead) continue;
      let dx = z.x - player.x;
      let dy = z.y - player.y;
      let d = Math.hypot(dx, dy);
      const minDist = player.radius + z.radius;
      if (d < minDist) {
        if (d === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d = Math.hypot(dx, dy) || 1;
        }
        const overlap = minDist - d;
        const playerWeight = z.type === 'boss' ? 0.75 : (z.type === 'brute' ? 0.55 : 0.4);
        const zombieWeight = 1.0 - playerWeight;
        
        player.x = clamp(player.x - (dx / d) * overlap * playerWeight, player.radius, WORLD_W - player.radius);
        player.y = clamp(player.y - (dy / d) * overlap * playerWeight, player.radius, WORLD_H - player.radius);
        z.x = clamp(z.x + (dx / d) * overlap * zombieWeight, z.radius, WORLD_W - z.radius);
        z.y = clamp(z.y + (dy / d) * overlap * zombieWeight, z.radius, WORLD_H - z.radius);
      }
    }
  }

  // Zombie-to-Zombie Soft Separation Physics (Prevents Horde Stacking / Clumping)
  for (let i = 0; i < zombies.length; i++) {
    const z1 = zombies[i];
    if (z1.dead) continue;
    for (let j = i + 1; j < zombies.length; j++) {
      const z2 = zombies[j];
      if (z2.dead) continue;
      let dx = z2.x - z1.x;
      let dy = z2.y - z1.y;
      let d = Math.hypot(dx, dy);
      const minDist = z1.radius + z2.radius;
      if (d < minDist) {
        if (d === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d = Math.hypot(dx, dy) || 1;
        }
        const overlap = (minDist - d);
        const pushX = (dx / d) * overlap * 0.45;
        const pushY = (dy / d) * overlap * 0.45;
        z1.x = clamp(z1.x - pushX, z1.radius, WORLD_W - z1.radius);
        z1.y = clamp(z1.y - pushY, z1.radius, WORLD_H - z1.radius);
        z2.x = clamp(z2.x + pushX, z2.radius, WORLD_W - z2.radius);
        z2.y = clamp(z2.y + pushY, z2.radius, WORLD_H - z2.radius);
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
