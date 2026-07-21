import { Vec2, Resource, Crate, Structure, StructureKind } from '../types';
import {
  WORLD_W, WORLD_H, TILE, BUILD_REACH, GRASS_DAY, GRASS_NIGHT,
  TUFT_DAY, TUFT_NIGHT, STRUCTURE_TIERS, BUILD_DEFS, POWERUP_DEFS,
  MINIMAP_SIZE, MINIMAP_MARGIN
} from '../constants';
import {
  camera, terrainPatches, bloodDecals, decor, fireflies, stars,
  dayNight, bloodMoon, player, resources, crates, powerups, structures,
  activeBoss, selectedBuild, shopOpen, manualBuildAngle, mouse
} from '../state';
import { mixHex, roundRectPath, dist, gridCellCenter, snapAngleToCardinal } from '../utils';
import { findNearestShop } from '../systems/update';

export function worldToScreen(x: number, y: number): Vec2 {
  return { x: x - camera.x, y: y - camera.y };
}

export function getPlacementAngle(): number {
  return manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
}

export function getBuildTarget(): {
  cx: number; cy: number; occupant: Structure | null;
  canUpgrade: boolean; blockedByResource: boolean; canAfford: boolean;
} {
  const build = selectedBuild as StructureKind;
  const mp = mouseWorldPos();
  const dx = mp.x - player.x, dy = mp.y - player.y;
  const d = Math.hypot(dx, dy);
  let tx = mp.x, ty = mp.y;
  if (d > BUILD_REACH) {
    tx = player.x + dx / d * BUILD_REACH;
    ty = player.y + dy / d * BUILD_REACH;
  }
  const cell = gridCellCenter(tx, ty, TILE);
  const occupant = structureAtCell(cell.x, cell.y);
  const canUpgrade = !!occupant && occupant.type === build &&
    (occupant.type === 'wall' || occupant.type === 'turret' || occupant.type === 'spike');

  const def = BUILD_DEFS[build];
  let blockedByResource = false;
  if (!occupant) {
    for (const r of resources) {
      if (dist(cell.x, cell.y, r.x, r.y) < def.radius + r.radius) { blockedByResource = true; break; }
    }
  }
  const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
  const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
  const canAfford = player.wood >= wCost && player.stone >= sCost;

  return { cx: cell.x, cy: cell.y, occupant, canUpgrade, blockedByResource, canAfford };
}

export function mouseWorldPos(): Vec2 {
  return { x: mouse.x + camera.x, y: mouse.y + camera.y };
}

export function structureAtCell(cx: number, cy: number): Structure | null {
  for (const s of structures) {
    const c = gridCellCenter(s.x, s.y, TILE);
    if (Math.abs(c.x - cx) < 1 && Math.abs(c.y - cy) < 1) return s;
  }
  return null;
}

export function drawShadow(ctx: CanvasRenderingContext2D, sx: number, sy: number, radius: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + radius * 0.55, radius * 0.85, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function radialFill(ctx: CanvasRenderingContext2D, sx: number, sy: number, radius: number, cLight: string, cDark: string): CanvasGradient {
  const g = ctx.createRadialGradient(sx - radius * 0.3, sy - radius * 0.3, radius * 0.1, sx, sy, radius);
  g.addColorStop(0, cLight);
  g.addColorStop(1, cDark);
  return g;
}

export function drawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.fillStyle = mixHex(GRASS_DAY, GRASS_NIGHT, dayNight.factor);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of terrainPatches) {
    const s = worldToScreen(p.x, p.y);
    if (s.x < -p.r || s.x > canvas.width + p.r || s.y < -p.r || s.y > canvas.height + p.r) continue;
    ctx.fillStyle = p.dark ? 'rgba(40,35,15,0.22)' : 'rgba(160,180,80,0.12)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, p.r, p.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  for (const b of bloodDecals) {
    const s = worldToScreen(b.x, b.y);
    if (s.x < -30 || s.x > canvas.width + 30 || s.y < -30 || s.y > canvas.height + 30) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(b.rot);
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = '#3a0d0d';
    ctx.beginPath(); ctx.ellipse(0, 0, b.r, b.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.fillStyle = mixHex(TUFT_DAY, TUFT_NIGHT, dayNight.factor);
  for (const d of decor) {
    const s = worldToScreen(d.x, d.y);
    if (s.x < -20 || s.x > canvas.width + 20 || s.y < -20 || s.y > canvas.height + 20) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(d.a);
    const bladeLen = 9 * d.s;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const bx = i * 3 * d.s;
      ctx.moveTo(bx - 1.5, 0);
      ctx.lineTo(bx, -bladeLen * (1 - Math.abs(i) * 0.25));
      ctx.lineTo(bx + 1.5, 0);
    }
    ctx.fill();
    ctx.restore();
  }

  if (dayNight.factor > 0.25) {
    const t = performance.now();
    for (const f of fireflies) {
      const s = worldToScreen(f.x, f.y + Math.sin(t * f.speed + f.phase) * 10);
      if (s.x < -10 || s.x > canvas.width + 10 || s.y < -10 || s.y > canvas.height + 10) continue;
      const a = Math.min(1, dayNight.factor * 1.4) * (0.5 + 0.5 * Math.sin(t * 0.003 + f.phase * 3));
      ctx.fillStyle = `rgba(255,240,150,${a * 0.7})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawStars(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  if (dayNight.factor < 0.3) return;
  const a = (dayNight.factor - 0.3) / 0.7;
  const t = performance.now();
  for (const st of stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + st.phase);
    ctx.fillStyle = `rgba(255,255,255,${a * tw * 0.8})`;
    ctx.beginPath(); ctx.arc(st.xf * canvas.width, st.yf * canvas.height * 0.6, st.r, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawWorldBounds(ctx: CanvasRenderingContext2D): void {
  const tl = worldToScreen(0, 0);
  ctx.strokeStyle = '#ff6b6b55';
  ctx.lineWidth = 6;
  ctx.strokeRect(tl.x, tl.y, WORLD_W, WORLD_H);
}

export function drawResource(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, r: Resource): void {
  const s = worldToScreen(r.x, r.y);
  if (s.x < -60 || s.x > canvas.width + 60 || s.y < -60 || s.y > canvas.height + 60) return;
  drawShadow(ctx, s.x, s.y, r.radius);
  if (r.type === 'tree') {
    // Trunk drawn first so the canopy blobs cover most of it, leaving just a base peek visible.
    const trunkW = r.radius * 0.3, trunkH = r.radius * 0.6;
    ctx.fillStyle = '#5a3d24';
    ctx.strokeStyle = '#2e1f12'; ctx.lineWidth = 2;
    roundRectPath(ctx, s.x - trunkW / 2, s.y + r.radius * 0.1, trunkW, trunkH, 3);
    ctx.fill(); ctx.stroke();

    // Three offset canopy blobs instead of one flat circle, so the silhouette reads as
    // clustered foliage rather than a perfect disc.
    const blobs = [
      { dx: -r.radius * 0.4, dy: r.radius * 0.1, rr: r.radius * 0.58 },
      { dx: r.radius * 0.38, dy: r.radius * 0.12, rr: r.radius * 0.6 },
      { dx: 0, dy: -r.radius * 0.18, rr: r.radius * 0.82 },
    ];
    for (const b of blobs) {
      ctx.fillStyle = radialFill(ctx, s.x + b.dx, s.y + b.dy, b.rr, '#3a6b46', '#1e3d28');
      ctx.strokeStyle = '#14201a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(s.x + b.dx, s.y + b.dy, b.rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // Brighter inner canopy + a leaf-light speckle for depth, plus a couple darker
    // mottling spots so the foliage isn't a flat gradient.
    ctx.fillStyle = radialFill(ctx, s.x, s.y - r.radius * 0.18, r.radius * 0.5, '#5a9a68', '#3f7a4d');
    ctx.beginPath(); ctx.arc(s.x, s.y - r.radius * 0.18, r.radius * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,220,160,0.4)';
    ctx.beginPath(); ctx.arc(s.x - r.radius * 0.22, s.y - r.radius * 0.42, r.radius * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,40,25,0.25)';
    ctx.beginPath(); ctx.arc(s.x + r.radius * 0.28, s.y - r.radius * 0.02, r.radius * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x - r.radius * 0.3, s.y + r.radius * 0.22, r.radius * 0.11, 0, Math.PI * 2); ctx.fill();
  } else {
    // A small cluster of overlapping chunks (instead of one flat hexagon) reads as a
    // rock pile rather than a single uniform gem shape.
    const chunks = [
      { dx: -r.radius * 0.34, dy: r.radius * 0.2, rr: r.radius * 0.56, sides: 5, rot: 0.4 },
      { dx: r.radius * 0.32, dy: r.radius * 0.24, rr: r.radius * 0.48, sides: 6, rot: -0.2 },
      { dx: 0, dy: -r.radius * 0.06, rr: r.radius * 0.8, sides: 6, rot: 0 },
    ];
    for (const c of chunks) {
      ctx.fillStyle = radialFill(ctx, s.x + c.dx, s.y + c.dy, c.rr, '#7a888c', '#4a565a');
      ctx.beginPath();
      for (let i = 0; i <= c.sides; i++) {
        const a = i / c.sides * Math.PI * 2 + c.rot;
        const px = s.x + c.dx + c.rr * Math.cos(a), py = s.y + c.dy + c.rr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#14201a'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // Facet crevice lines across the main chunk, a highlight matching the light source
    // used elsewhere (top-left), and a couple of moss speckles to tie it into the grass.
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - r.radius * 0.22, s.y - r.radius * 0.52);
    ctx.lineTo(s.x + r.radius * 0.05, s.y - r.radius * 0.05);
    ctx.lineTo(s.x - r.radius * 0.15, s.y + r.radius * 0.42);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.arc(s.x - r.radius * 0.28, s.y - r.radius * 0.34, r.radius * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,150,90,0.3)';
    ctx.beginPath(); ctx.arc(s.x + r.radius * 0.3, s.y + r.radius * 0.16, r.radius * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  if (r.hp < r.maxHp) {
    const w = r.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - w / 2, s.y - r.radius - 12, w, 5);
    ctx.fillStyle = '#8bd17c'; ctx.fillRect(s.x - w / 2, s.y - r.radius - 12, w * (r.hp / r.maxHp), 5);
  }
}

export function drawCrate(ctx: CanvasRenderingContext2D, c: Crate): void {
  const s = worldToScreen(c.x, c.y);
  drawShadow(ctx, s.x, s.y, c.radius);
  ctx.fillStyle = '#e0b04a';
  ctx.fillRect(s.x - c.radius, s.y - c.radius, c.radius * 2, c.radius * 2);
  ctx.strokeStyle = '#8a641f'; ctx.lineWidth = 3;
  ctx.strokeRect(s.x - c.radius, s.y - c.radius, c.radius * 2, c.radius * 2);
  ctx.beginPath(); ctx.moveTo(s.x - c.radius, s.y); ctx.lineTo(s.x + c.radius, s.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s.x, s.y - c.radius); ctx.lineTo(s.x, s.y + c.radius); ctx.stroke();
}

export function drawStructure(ctx: CanvasRenderingContext2D, st: Structure): void {
  const s = worldToScreen(st.x, st.y);
  drawShadow(ctx, s.x, s.y, st.radius);
  const ang = st.angle || 0;
  if (st.type === 'wall') {
    const tierGray = ['#8f9498', '#a9aeb2', '#c3c8cc'];
    const col = tierGray[st.tier ?? 0];
    const w = st.radius * 2.3, h = st.radius * 1.0;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = col;
    ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 4;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 2.5;
    for (let i = 1; i < 3; i++) {
      const dx = -w / 2 + i * (w / 3);
      ctx.beginPath(); ctx.moveTo(dx, -h / 2 + 3); ctx.lineTo(dx, h / 2 - 3); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-w / 2 + 3, 0); ctx.lineTo(w / 2 - 3, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 5, -h / 2 + 3); ctx.lineTo(w / 2 - 5, -h / 2 + 3); ctx.stroke();
    ctx.restore();
  } else if (st.type === 'spike') {
    const w = st.radius * 2.4, h = st.radius * 0.62;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang + Math.PI / 2);
    const spikeTierColors = ['#b8c0c4', '#d8e0e4', '#f0f8fc'];
    ctx.fillStyle = spikeTierColors[st.tier ?? 0];
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const px = -w / 2 + (i + 0.5) * (w / 5);
      ctx.beginPath();
      ctx.moveTo(px - 5, -h / 2 + 2);
      ctx.lineTo(px, -h / 2 - h * 1.5);
      ctx.lineTo(px + 5, -h / 2 + 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 5, h / 2 - 2);
      ctx.lineTo(px, h / 2 + h * 1.5);
      ctx.lineTo(px + 5, h / 2 - 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#7a5230';
    ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 3.5;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 4);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h * 0.15); ctx.lineTo(w / 2 - 4, -h * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 4, h * 0.15); ctx.lineTo(w / 2 - 4, h * 0.15); ctx.stroke();
    ctx.restore();
  } else if (st.type === 'turret') {
    const turretTierColors = ['#4a5a5e', '#597b7f', '#6a9a9e'];
    ctx.fillStyle = turretTierColors[st.tier ?? 0];
    ctx.strokeStyle = '#1c2426'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(s.x, s.y, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b7a7e';
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([ox, oy]) => {
      ctx.beginPath(); ctx.arc(s.x + ox, s.y + oy, 2, 0, Math.PI * 2); ctx.fill();
    });
    const aimA = st.aimAngle ?? -Math.PI / 2;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(aimA + Math.PI / 2);
    ctx.fillStyle = '#2f3a3c';
    ctx.strokeStyle = '#1c2426'; ctx.lineWidth = 2;
    ctx.fillRect(-4, -st.radius - 10, 8, 12);
    ctx.strokeRect(-4, -st.radius - 10, 8, 12);
    ctx.restore();
  } else if (st.type === 'campfire') {
    ctx.fillStyle = '#5c4530';
    ctx.strokeStyle = '#22190f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath(); ctx.arc(s.x, s.y - 3, st.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(s.x, s.y - 6, st.radius * 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (st.type === 'shop') {
    const w = st.radius * 2.2, h = st.radius * 1.3;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = '#7a5230';
    ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 3.5;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.fill(); ctx.stroke();
    const stripes = 5;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c98b4a' : '#ffd76a';
      const sx0 = -w / 2 + i * (w / stripes);
      ctx.beginPath();
      ctx.moveTo(sx0, -h / 2);
      ctx.lineTo(sx0 + w / stripes, -h / 2);
      ctx.lineTo(sx0 + w / stripes * 0.6, -h / 2 - 10);
      ctx.lineTo(sx0 + w / stripes * 0.4, -h / 2 - 10);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(s.x, s.y - st.radius * 0.1, st.radius * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a641f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7a5230';
    ctx.font = `bold ${Math.round(st.radius * 0.4)}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('$', s.x, s.y - st.radius * 0.1 + st.radius * 0.14);
  }
  if (st.hp < st.maxHp) {
    const w = st.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - w / 2, s.y - st.radius - 14, w, 5);
    ctx.fillStyle = '#e2b477'; ctx.fillRect(s.x - w / 2, s.y - st.radius - 14, w * (st.hp / st.maxHp), 5);
  }
}

export function drawBuildPreview(ctx: CanvasRenderingContext2D): void {
  if (!player.alive || shopOpen || !selectedBuild || findNearestShop(80)) return;

  const target = getBuildTarget();
  const s = worldToScreen(target.cx, target.cy);
  const half = TILE / 2;

  let color = '#8bd17c';
  let label = '';

  if (target.occupant && target.canUpgrade && (target.occupant.type === 'wall' || target.occupant.type === 'turret' || target.occupant.type === 'spike')) {
    const tiers = STRUCTURE_TIERS[target.occupant.type];
    const next = tiers[(target.occupant.tier || 0) + 1];
    if (next) { color = '#4ecdc4'; label = 'UPGRADE  ' + next.pointsCost + ' pts'; }
    else { color = '#8bd17c'; label = 'MAX TIER'; }
  } else if (target.occupant) {
    color = '#ff5c5c'; label = 'occupied';
  } else if (target.blockedByResource) {
    color = '#ff5c5c'; label = 'blocked';
  } else if (!target.canAfford) {
    color = '#ff9f43'; label = 'not enough materials';
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(s.x - half, s.y - half, TILE, TILE);
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = color;
  ctx.fillRect(s.x - half, s.y - half, TILE, TILE);
  ctx.globalAlpha = 1;
  ctx.restore();

  if (!target.occupant && !target.blockedByResource) {
    const def = BUILD_DEFS[selectedBuild];
    const ghostAngle = getPlacementAngle();
    const ghost: Structure = { type: selectedBuild, x: target.cx, y: target.cy, radius: def.radius, hp: def.hp, maxHp: def.hp, angle: ghostAngle };
    if (selectedBuild === 'turret') ghost.aimAngle = ghostAngle;
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawStructure(ctx, ghost);
    ctx.restore();
  }

  if (label) {
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(label, s.x, s.y - half - 8);
  }
}

export function minimapPoint(wx: number, wy: number, mapX: number, mapY: number): Vec2 {
  return { x: mapX + (wx / WORLD_W) * MINIMAP_SIZE, y: mapY + (wy / WORLD_H) * MINIMAP_SIZE };
}

export function drawMinimap(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const mapX = canvas.width - MINIMAP_SIZE - MINIMAP_MARGIN;
  const mapY = MINIMAP_MARGIN;
  const now = performance.now();

  ctx.save();
  ctx.fillStyle = 'rgba(16,29,24,0.85)';
  ctx.strokeStyle = dayNight.isNight ? '#7c9bd1' : '#2c4536';
  ctx.lineWidth = 2;
  ctx.fillRect(mapX, mapY, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.strokeRect(mapX, mapY, MINIMAP_SIZE, MINIMAP_SIZE);

  ctx.beginPath();
  ctx.rect(mapX, mapY, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.clip();

  let baseX = WORLD_W / 2, baseY = WORLD_H / 2;
  if (structures.length > 0) {
    let sx = 0, sy = 0;
    for (const st of structures) { sx += st.x; sy += st.y; }
    baseX = sx / structures.length;
    baseY = sy / structures.length;
  }
  const basePt = minimapPoint(baseX, baseY, mapX, mapY);
  ctx.fillStyle = '#c98b4a';
  ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(basePt.x, basePt.y - 5);
  ctx.lineTo(basePt.x - 5, basePt.y + 4);
  ctx.lineTo(basePt.x + 5, basePt.y + 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#e0b04a';
  for (const c of crates) {
    const p = minimapPoint(c.x, c.y, mapX, mapY);
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }

  for (const pu of powerups) {
    const p = minimapPoint(pu.x, pu.y, mapX, mapY);
    const def = POWERUP_DEFS[pu.kind];
    const pulse = 0.6 + 0.4 * Math.sin(now * 0.006);
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 * pulse, 0, Math.PI * 2); ctx.fill();
  }

  if (activeBoss) {
    const p = minimapPoint(activeBoss.x, activeBoss.y, mapX, mapY);
    const pulse = 0.7 + 0.3 * Math.sin(now * 0.01);
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
  }

  const pp = minimapPoint(player.x, player.y, mapX, mapY);
  ctx.fillStyle = '#eaf3ec';
  ctx.strokeStyle = '#0a1410'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#eaf3ec'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pp.x, pp.y);
  ctx.lineTo(pp.x + Math.cos(player.angle) * 9, pp.y + Math.sin(player.angle) * 9);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = dayNight.isNight ? 'rgba(124,155,209,0.85)' : 'rgba(234,243,236,0.55)';
  ctx.font = "10px 'Orbitron', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(dayNight.isNight ? 'MAP · NIGHT' : 'MAP', mapX + MINIMAP_SIZE / 2, mapY + MINIMAP_SIZE + 13);
}
