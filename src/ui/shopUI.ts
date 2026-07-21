import { ShopCategory, ShopItemDef, StructureKind, WeaponKind, MutationKind } from '../types';
import {
  WEAPON_DEFS, MUTATION_DEFS, BUILD_DEFS, STRUCTURE_TIERS, TOWER_LEVELS
} from '../constants';

export const upgrades: { key: string; label: string; desc: string; apply: () => void }[] = [
  { key: 'hp', label: 'Vitality', desc: '+20 Max HP', apply: () => { player.maxHp += 20; player.hp += 20; } },
  { key: 'spd', label: 'Speed', desc: '+0.35 Speed', apply: () => { player.maxSpeed += 0.35; } },
  { key: 'dmg', label: 'Power', desc: '+3 Damage', apply: () => { player.damage += 3; } },
  { key: 'rate', label: 'Reload', desc: '+0.45 Fire Rate', apply: () => { player.fireRate += 0.45; } }
];
import {
  player, structures, selectedBuild, setSelectedBuild, manualBuildAngle,
  setManualBuildAngle, shopOpen, setShopOpen, factoryOpen, setFactoryOpen,
  weaponChoiceOpen, setWeaponChoiceOpen,
  mutationChoiceOpen, setMutationChoiceOpen, zombies, zombiesToSpawn, wave
} from '../state';
import { byId, snapAngleToCardinal } from '../utils';
import { applyPowerup, showBanner, spawnParticle, spawnBurst } from '../systems/combat';
import { findNearestShop, findNearestFactory } from '../systems/update';
import { getBuildTarget, getPlacementAngle } from '../render/drawWorld';

export function createShopItems(): ShopItemDef[] {
  return [
    { key: 'buy_insta',  category: 'powerup', label: 'Insta-Kill',    desc: '20s of one-shot kills',    cost: 80,  apply: () => applyPowerup('insta') },
    { key: 'buy_double', category: 'powerup', label: 'Double XP',     desc: '30s of 2x XP',             cost: 60,  apply: () => applyPowerup('double') },
    { key: 'buy_heal',   category: 'powerup', label: 'Full Heal',     desc: 'restore all HP',           cost: 50,  apply: () => applyPowerup('heal') },
    { key: 'buy_nuke',   category: 'powerup', label: 'Nuke',          desc: 'devastate nearby zombies', cost: 150, apply: () => applyPowerup('nuke') },

    { key: 'boost_speed',  category: 'boost', label: 'Adrenaline',   desc: '+35% speed, 45s',      cost: 40, apply: () => { player.speedBoostUntil = performance.now() + 45000; showBanner('ADRENALINE', 'speed boosted', 'power'); } },
    { key: 'boost_damage', category: 'boost', label: 'Sharpshooter', desc: '+50% damage, 45s',     cost: 70, apply: () => { player.damageBoostUntil = performance.now() + 45000; showBanner('SHARPSHOOTER', 'damage boosted', 'power'); } },
    { key: 'boost_rate',   category: 'boost', label: 'Rapid Fire',   desc: '+40% fire rate, 45s',  cost: 70, apply: () => { player.fireRateBoostUntil = performance.now() + 45000; showBanner('RAPID FIRE', 'fire rate boosted', 'power'); } },
    { key: 'boost_regen',  category: 'boost', label: 'Field Medic',  desc: '3x HP regen, 45s',     cost: 40, apply: () => { player.regenBoostUntil = performance.now() + 45000; showBanner('FIELD MEDIC', 'regen boosted', 'power'); } },

    { key: 'special_repair', category: 'special', label: 'Repair Crew',   desc: 'fully repair all structures', cost: 50,
      apply: () => { for (const s of structures) s.hp = s.maxHp; showBanner('REPAIR CREW', 'structures restored', 'power'); } },
    { key: 'special_cache',  category: 'special', label: 'Supply Drop',   desc: '+40 wood, +30 stone', cost: 40,
      apply: () => { player.wood += 40; player.stone += 30; showBanner('SUPPLY DROP', '+40 wood, +30 stone', 'power'); } },
    { key: 'special_life',   category: 'special', label: 'Second Chance', desc: 'survive one lethal hit', cost: 200,
      disabledIf: () => player.secondChance,
      apply: () => { player.secondChance = true; showBanner('SECOND CHANCE', "you'll survive one lethal hit", 'power'); } },

    { key: 'skin_default', category: 'cosmetic', label: 'Default', desc: 'no tint',        cost: 0,  isEquipped: () => player.skinTint === null,      apply: () => { player.skinTint = null; } },
    { key: 'skin_crimson', category: 'cosmetic', label: 'Crimson', desc: 'red skin tint',  cost: 30, isEquipped: () => player.skinTint === 'crimson', apply: () => { player.skinTint = 'crimson'; } },
    { key: 'skin_azure',   category: 'cosmetic', label: 'Azure',   desc: 'blue skin tint', cost: 30, isEquipped: () => player.skinTint === 'azure',   apply: () => { player.skinTint = 'azure'; } },
    { key: 'skin_golden',  category: 'cosmetic', label: 'Golden',  desc: 'gold skin tint', cost: 30, isEquipped: () => player.skinTint === 'golden',  apply: () => { player.skinTint = 'golden'; } },
    { key: 'skin_shadow',  category: 'cosmetic', label: 'Shadow',  desc: 'dark skin tint', cost: 30, isEquipped: () => player.skinTint === 'shadow',  apply: () => { player.skinTint = 'shadow'; } }
  ];
}

const shopItemsList = createShopItems();

export function renderShopPanel(): void {
  const ptsVal = byId('shopPointsVal');
  if (ptsVal) ptsVal.textContent = String(player.points);
  const wrap = byId('shopItems');
  if (!wrap) return;
  wrap.innerHTML = '';
  const categories: { key: ShopCategory; title: string }[] = [
    { key: 'powerup', title: 'POWERUPS' },
    { key: 'boost', title: 'TEMPORARY BOOSTS' },
    { key: 'special', title: 'SPECIAL ITEMS' },
    { key: 'cosmetic', title: 'COSMETICS' }
  ];
  categories.forEach(cat => {
    const title = document.createElement('div');
    title.className = 'shop-cat-title';
    title.textContent = cat.title;
    wrap.appendChild(title);
    const row = document.createElement('div');
    row.className = 'shop-row';
    shopItemsList.filter(it => it.category === cat.key).forEach(item => {
      const cantAfford = player.points < item.cost;
      const blocked = !!(item.disabledIf && item.disabledIf());
      const equipped = !!(item.isEquipped && item.isEquipped());
      const btn = document.createElement('div');
      btn.className = 'shop-item' + ((cantAfford || blocked) && !equipped ? ' disabled' : '') + (equipped ? ' equipped' : '');
      btn.innerHTML = `<b>${item.label}</b><div class="desc">${item.desc}</div><div class="cost">${item.cost > 0 ? item.cost + ' pts' : 'free'}</div>`;
      btn.onclick = () => {
        if (blocked || equipped) return;
        if (player.points < item.cost) return;
        player.points -= item.cost;
        item.apply();
        renderShopPanel();
      };
      row.appendChild(btn);
    });
    wrap.appendChild(row);
  });
}

export function toggleShop(): void {
  setShopOpen(!shopOpen);
  if (shopOpen) { renderShopPanel(); byId('shopPanel').classList.remove('hidden'); }
  else { byId('shopPanel').classList.add('hidden'); }
}

export function selectBuild(key: StructureKind): void {
  setSelectedBuild((selectedBuild === key) ? null : key);
  setManualBuildAngle(null);
  renderBuildBar();
}

function drawBuildPreview(canvas: HTMLCanvasElement, key: StructureKind): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (key === 'wall') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = '#a9aeb2';
    ctx.strokeStyle = '#2a2d30';
    ctx.lineWidth = 2.0;
    
    const w = 26, h = 9;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 2.5);
    else ctx.rect(-w/2, -h/2, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w/2 + w/3, -h/2); ctx.lineTo(-w/2 + w/3, h/2);
    ctx.moveTo(w/2 - w/3, -h/2); ctx.lineTo(w/2 - w/3, h/2);
    ctx.moveTo(-w/2, 0); ctx.lineTo(w/2, 0);
    ctx.stroke();
    ctx.restore();
  } else if (key === 'spike') {
    ctx.save();
    ctx.translate(cx, cy + 1);
    ctx.fillStyle = '#d8e0e4';
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 1.2;

    const w = 24, h = 6;
    for (let i = 0; i < 4; i++) {
      const px = -w/2 + (i + 0.5) * (w / 4);
      ctx.beginPath();
      ctx.moveTo(px - 2, -h/2);
      ctx.lineTo(px, -h/2 - 5);
      ctx.lineTo(px + 2, -h/2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    ctx.fillStyle = '#7a5230';
    ctx.strokeStyle = '#2a1c0e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 1.5);
    else ctx.rect(-w/2, -h/2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (key === 'cannon') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#6a9a9e';
    ctx.strokeStyle = '#1c2426';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2f3a3c';
    ctx.fillRect(-2, -12, 4, 7);
    ctx.strokeRect(-2, -12, 4, 7);
    ctx.restore();
  } else if (key === 'mortar') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#34495e';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a252f';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (key === 'sniper') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#7f8c8d';
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillRect(-1, -14, 2, 10);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(0, -14, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (key === 'tesla') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#d35400';
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-2, -6); ctx.lineTo(2, -6); ctx.lineTo(6, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5dade2';
    ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (key === 'frost') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#a5f3fc';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, -2);
    ctx.lineTo(3, 8);
    ctx.lineTo(-3, 8);
    ctx.lineTo(-5, -2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (key === 'toxic') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#27ae60';
    ctx.strokeStyle = '#1e8449';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI * 2); ctx.arc(2, 2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (key === 'factory') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#962d22';
    ctx.lineWidth = 2.0;
    ctx.fillRect(-10, -4, 20, 11);
    ctx.strokeRect(-10, -4, 20, 11);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(-6, -10, 3, 6);
    ctx.fillRect(2, -10, 3, 6);
    ctx.restore();
  } else if (key === 'campfire') {
    ctx.save();
    ctx.translate(cx, cy);
    
    ctx.fillStyle = '#5c4530';
    ctx.strokeStyle = '#22190f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 1.5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(0, -0.5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(0, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (key === 'shop') {
    ctx.save();
    ctx.translate(cx, cy + 1);
    
    const w = 24, h = 13;
    ctx.fillStyle = '#7a5230';
    ctx.strokeStyle = '#2a1c0e';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 2);
    else ctx.rect(-w/2, -h/2, w, h);
    ctx.fill();
    ctx.stroke();

    const stripes = 4;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c98b4a' : '#ffd76a';
      const sx = -w/2 + i * (w / stripes);
      ctx.beginPath();
      ctx.moveTo(sx, -h/2);
      ctx.lineTo(sx + w/stripes, -h/2);
      ctx.lineTo(sx + w/stripes * 0.8, -h/2 - 4);
      ctx.lineTo(sx + w/stripes * 0.2, -h/2 - 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

export function renderBuildBar(): void {
  const bar = byId('buildBar');
  if (!bar) return;
  bar.innerHTML = '';
  const order: StructureKind[] = ['wall', 'spike', 'cannon', 'mortar', 'sniper', 'campfire', 'shop', 'factory'];

  order.forEach((key, index) => {
    const def = BUILD_DEFS[key];
    const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
    const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
    
    const slot = document.createElement('div');
    slot.className = 'build-slot' + (selectedBuild === key ? ' active' : '');
    slot.onclick = () => selectBuild(key);

    const badge = document.createElement('div');
    badge.className = 'build-key-badge';
    badge.textContent = String(index + 1);
    slot.appendChild(badge);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'build-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 36;
    canvasWrap.appendChild(canvas);
    slot.appendChild(canvasWrap);
    
    // Draw structure preview on canvas
    drawBuildPreview(canvas, key);

    const label = document.createElement('b');
    label.textContent = def.label;
    slot.appendChild(label);

    const cost = document.createElement('div');
    cost.className = 'cost';
    cost.textContent = (wCost ? wCost + 'w ' : '') + (sCost ? sCost + 's' : '');
    slot.appendChild(cost);

    bar.appendChild(slot);
  });
}

export function renderUpgradePanel(): void {
  const panel = byId('upgradePanel');
  if (!panel) return;
  panel.innerHTML = '';
  if (player.statPoints <= 0) return;
  upgrades.forEach(u => {
    const btn = document.createElement('div');
    btn.className = 'upgrade-btn';
    btn.innerHTML = `<b>${u.label}</b>${u.desc}`;
    btn.onclick = () => {
      if (player.statPoints <= 0) return;
      u.apply();
      player.statPoints--;
      renderUpgradePanel();
    };
    panel.appendChild(btn);
  });
}

export function tryBuildOrUpgrade(): void {
  if (!player.alive) return;
  if (shopOpen) { toggleShop(); return; }
  if (factoryOpen) { toggleFactory(); return; }

  if (!selectedBuild) {
    if (findNearestShop(80)) { toggleShop(); return; }
    if (findNearestFactory(80)) { toggleFactory(); return; }
    spawnParticle(player.x, player.y - 30, 'no building selected', '#7fa08c');
    return;
  }

  const target = getBuildTarget();
  const occupant = target.occupant;

  if (occupant && target.canUpgrade) {
    if (occupant.type === 'wall' || occupant.type === 'spike') {
      const tiers = STRUCTURE_TIERS[occupant.type];
      const curTier = occupant.tier || 0;
      const next = tiers[curTier + 1];
      if (next) {
        if (player.points >= next.pointsCost) {
          player.points -= next.pointsCost;
          occupant.tier = curTier + 1;
          occupant.maxHp = next.hpMax;
          occupant.hp = next.hpMax;
          if (occupant.type === 'spike') { occupant.damage = next.damage; }
          spawnParticle(occupant.x, occupant.y - 30, next.name.toUpperCase() + ' ' + occupant.type.toUpperCase(), '#c7cfd2');
        } else {
          spawnParticle(player.x, player.y - 30, 'need ' + next.pointsCost + ' points', '#ff8080');
        }
      } else {
        spawnParticle(occupant.x, occupant.y - 30, 'MAX TIER', '#8bd17c');
      }
      return;
    }
    
    // Towers: cannon, mortar, sniper, tesla, frost, toxic
    if (occupant.type === 'cannon' || occupant.type === 'mortar' || occupant.type === 'sniper' || occupant.type === 'tesla' || occupant.type === 'frost' || occupant.type === 'toxic') {
      const curLvl = occupant.level || 1;
      if (curLvl >= 5) {
        spawnParticle(occupant.x, occupant.y - 30, 'MAX LEVEL', '#8bd17c');
        return;
      }
      
      const levels = TOWER_LEVELS[occupant.type];
      const nextSpec = levels[curLvl];
      const costInfo = nextSpec.cost;
      
      if (costInfo) {
        const res = costInfo.resource;
        const amt = costInfo.amount;
        
        if (player[res] >= amt) {
          player[res] -= amt;
          occupant.level = curLvl + 1;
          
          const hpFactor = 1.0 + (occupant.level - 1) * 0.50;
          const baseHp = BUILD_DEFS[occupant.type].hp;
          occupant.maxHp = Math.round(baseHp * hpFactor);
          occupant.hp = occupant.maxHp;
          
          spawnParticle(occupant.x, occupant.y - 30, 'Lv.' + occupant.level + ' ' + occupant.type.toUpperCase() + '!', '#ffd76a');
          spawnBurst(occupant.x, occupant.y, '#ffd76a', 12);
        } else {
          spawnParticle(player.x, player.y - 30, 'need ' + amt + ' ' + res, '#ff8080');
        }
      }
      return;
    }
  }

  if (occupant) {
    spawnParticle(player.x, player.y - 30, 'cell occupied', '#ff8080');
    return;
  }
  if (target.blockedByResource) {
    spawnParticle(player.x, player.y - 30, 'blocked', '#ff8080');
    return;
  }
  if (!target.canAfford) {
    spawnParticle(player.x, player.y - 30, 'not enough materials', '#ff8080');
    return;
  }

  const def = BUILD_DEFS[selectedBuild];
  const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
  const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
  player.wood -= wCost; player.stone -= sCost;

  const placedAngle = getPlacementAngle();
  const s = { type: selectedBuild, x: target.cx, y: target.cy, radius: def.radius, hp: def.hp, maxHp: def.hp, angle: placedAngle } as any;
  if (selectedBuild === 'wall') s.tier = 0;
  if (selectedBuild === 'spike') { s.damage = def.damage; s.tier = 0; }
  if (selectedBuild === 'campfire') { s.healRadius = def.healRadius; s.healRate = def.healRate; }
  if (selectedBuild === 'cannon' || selectedBuild === 'mortar' || selectedBuild === 'sniper' || selectedBuild === 'tesla' || selectedBuild === 'frost' || selectedBuild === 'toxic') {
    s.level = 1;
    s.aimAngle = placedAngle;
    s.lastShot = 0;
  }
  structures.push(s);
}

export function renderWeaponChoice(): void {
  const wrap = byId('weaponChoiceItems');
  if (!wrap) return;
  wrap.innerHTML = '';
  (Object.keys(WEAPON_DEFS) as WeaponKind[]).filter(k => k !== 'pistol').forEach(key => {
    const def = WEAPON_DEFS[key];
    const card = document.createElement('div');
    card.className = 'weapon-card';
    card.innerHTML = `<b>${def.label}</b><div class="desc">${def.desc}</div><div class="playstyle">${def.playstyle}</div>`;
    card.onclick = () => {
      player.weapon = key;
      player.weaponChosen = true;
      setWeaponChoiceOpen(false);
      byId('weaponChoicePanel').classList.add('hidden');
      showBanner(def.label.toUpperCase() + ' UNLOCKED', def.playstyle, 'power');
    };
    wrap.appendChild(card);
  });
}

export function openWeaponChoice(): void {
  setWeaponChoiceOpen(true);
  renderWeaponChoice();
  byId('weaponChoicePanel').classList.remove('hidden');
}

export function renderMutationChoice(): void {
  const wrap = byId('mutationChoiceItems');
  if (!wrap) return;
  wrap.innerHTML = '';
  (Object.keys(MUTATION_DEFS) as MutationKind[]).forEach(key => {
    const def = MUTATION_DEFS[key];
    const card = document.createElement('div');
    card.className = 'mutation-card';
    card.innerHTML = `<b>${def.label}</b><div class="desc">${def.desc}</div><div class="playstyle">${def.playstyle}</div>`;
    card.onclick = () => {
      player.mutation = key;
      player.mutationChosen = true;
      def.apply(player);
      setMutationChoiceOpen(false);
      byId('mutationChoicePanel').classList.add('hidden');
      showBanner(def.label.toUpperCase() + ' UNLOCKED', def.playstyle, 'power');
    };
    wrap.appendChild(card);
  });
}

export function openMutationChoice(): void {
  setMutationChoiceOpen(true);
  renderMutationChoice();
  byId('mutationChoicePanel').classList.remove('hidden');
}

export function updateHud(): void {
  byId('waveLabel').textContent = 'WAVE ' + wave;
  byId('zLabel').textContent = 'zombies: ' + zombies.length + (zombiesToSpawn > 0 ? ' (+' + zombiesToSpawn + ')' : '');
  byId('woodCount').textContent = String(player.wood);
  byId('stoneCount').textContent = String(player.stone);
  byId('ironCount').textContent = String(player.iron);
  byId('goldCount').textContent = String(player.gold);
  byId('levelTag').textContent = 'LEVEL ' + player.level + (player.statPoints > 0 ? '  •  ' + player.statPoints + ' pt available' : '');
  byId('pointsCount').textContent = String(player.points);

  const now = performance.now();
  const instaEl = byId('puInsta');
  if (now < player.instaKillUntil) { instaEl.classList.add('show'); instaEl.textContent = '⚡ INSTA-KILL ' + Math.ceil((player.instaKillUntil - now) / 1000) + 's'; }
  else instaEl.classList.remove('show');
  const doubleEl = byId('puDouble');
  if (now < player.doubleXpUntil) { doubleEl.classList.add('show'); doubleEl.textContent = '2x XP ' + Math.ceil((player.doubleXpUntil - now) / 1000) + 's'; }
  else doubleEl.classList.remove('show');
  const speedEl = byId('puSpeed');
  if (now < player.speedBoostUntil) { speedEl.classList.add('show'); speedEl.textContent = '💨 SPEED ' + Math.ceil((player.speedBoostUntil - now) / 1000) + 's'; }
  else speedEl.classList.remove('show');
  const dmgEl = byId('puDamage');
  if (now < player.damageBoostUntil) { dmgEl.classList.add('show'); dmgEl.textContent = '🎯 DAMAGE ' + Math.ceil((player.damageBoostUntil - now) / 1000) + 's'; }
  else dmgEl.classList.remove('show');
  const rateEl = byId('puRate');
  if (now < player.fireRateBoostUntil) { rateEl.classList.add('show'); rateEl.textContent = '🔥 RAPID FIRE ' + Math.ceil((player.fireRateBoostUntil - now) / 1000) + 's'; }
  else rateEl.classList.remove('show');
  const regenEl = byId('puRegen');
  if (now < player.regenBoostUntil) { regenEl.classList.add('show'); regenEl.textContent = '💚 REGEN ' + Math.ceil((player.regenBoostUntil - now) / 1000) + 's'; }
  else regenEl.classList.remove('show');
  const heatEl = byId('puHeat');
  if (player.mutation === 'overclocked') {
    heatEl.classList.add('show');
    const overheated = now < player.overheatedUntil;
    heatEl.textContent = overheated ? '🌡️ OVERHEATED ' + Math.ceil((player.overheatedUntil - now) / 1000) + 's' : '🌡️ HEAT ' + Math.round(player.heat) + '%';
  } else heatEl.classList.remove('show');

  const shopHintEl = byId('shopHint');
  const factoryHintEl = byId('factoryHint');
  const nearShop = !shopOpen && !factoryOpen && findNearestShop(80);
  const nearFactory = !factoryOpen && !shopOpen && findNearestFactory(80);

  if (nearShop) shopHintEl?.classList.add('show'); else shopHintEl?.classList.remove('show');
  if (nearFactory) factoryHintEl?.classList.add('show'); else factoryHintEl?.classList.remove('show');

  if (shopOpen && !findNearestShop(100)) toggleShop();
  if (factoryOpen && !findNearestFactory(100)) toggleFactory();

  const rotateHintEl = byId('rotateHint');
  if (selectedBuild === 'wall' || selectedBuild === 'spike') rotateHintEl.classList.add('show'); else rotateHintEl.classList.remove('show');

  byId('hpFill').style.width = Math.max(0, (player.hp / player.maxHp * 100)) + '%';
  byId('hpText').textContent = Math.round(Math.max(0, player.hp)) + '/' + player.maxHp;
  byId('xpFill').style.width = (player.xp / player.xpToNext * 100) + '%';
  byId('xpText').textContent = Math.round(player.xp) + '/' + player.xpToNext;
}

export const ADVANCED_TOWERS: StructureKind[] = ['tesla', 'frost', 'toxic'];

export function renderFactoryPanel(): void {
  const wrap = byId('factoryItems');
  if (!wrap) return;
  wrap.innerHTML = '';

  ADVANCED_TOWERS.forEach(key => {
    const def = BUILD_DEFS[key];
    const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
    const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
    const cantAfford = player.wood < wCost || player.stone < sCost;

    const card = document.createElement('div');
    card.className = 'factory-item' + (cantAfford ? ' disabled' : '');
    
    let desc = '';
    let badgeText = '';
    if (key === 'tesla') {
      badgeText = 'CONTROL / CHAIN';
      desc = 'Fires chain lightning striking up to 6 targets. Lv.5 stuns enemies.';
    } else if (key === 'frost') {
      badgeText = 'CONTROL / AURA';
      desc = 'Emits a slowing freeze aura. Lv.5 freezes enemies solid.';
    } else if (key === 'toxic') {
      badgeText = 'DEBUFF / ACID';
      desc = 'Fires acid shells creating toxic clouds that shred enemy armor.';
    }

    card.innerHTML = `
      <div class="factory-item-header">
        <b>${def.label}</b>
        <span class="factory-badge">${badgeText}</span>
      </div>
      <div class="desc">${desc}</div>
      <div class="factory-item-footer">
        <div class="cost">${wCost} Wood, ${sCost} Stone</div>
        <button class="factory-build-btn">${selectedBuild === key ? 'SELECTED' : 'CRAFT & PLACE'}</button>
      </div>
    `;

    const btn = card.querySelector('.factory-build-btn') as HTMLButtonElement;
    btn.onclick = (e) => {
      e.stopPropagation();
      if (cantAfford) {
        spawnParticle(player.x, player.y - 30, 'not enough materials', '#ff8080');
        return;
      }
      selectBuild(key);
      toggleFactory();
    };

    wrap.appendChild(card);
  });
}

export function toggleFactory(): void {
  setFactoryOpen(!factoryOpen);
  if (factoryOpen) {
    if (shopOpen) setShopOpen(false);
    renderFactoryPanel();
    byId('factoryPanel')?.classList.remove('hidden');
  } else {
    byId('factoryPanel')?.classList.add('hidden');
  }
}
