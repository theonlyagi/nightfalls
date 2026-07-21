import { Vec2, Resource, Crate, Structure, StructureKind } from '../types';
import {
  WORLD_W, WORLD_H, TILE, BUILD_REACH, GRASS_DAY, GRASS_NIGHT,
  TUFT_DAY, TUFT_NIGHT, STRUCTURE_TIERS, BUILD_DEFS, POWERUP_DEFS,
  MINIMAP_SIZE, MINIMAP_MARGIN, TOWER_LEVELS
} from '../constants';
import {
  camera, terrainPatches, bloodDecals, decor, fireflies, stars,
  dayNight, bloodMoon, player, resources, crates, powerups, structures,
  activeBoss, selectedBuild, shopOpen, manualBuildAngle, mouse,
  fireZones, toxicClouds, teslaChains, sniperLasers, inspectedStructure
} from '../state';
import { mixHex, roundRectPath, dist, gridCellCenter, snapAngleToCardinal } from '../utils';
import { findNearestShop } from '../systems/update';

const imgTree = new Image();
imgTree.src = 'assets/tree.png';

const imgStone = new Image();
imgStone.src = 'assets/stone.png';

const imgIron = new Image();
imgIron.src = 'assets/iron.png';

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
    (occupant.type === 'wall' || occupant.type === 'spike' ||
     occupant.type === 'cannon' || occupant.type === 'mortar' || occupant.type === 'sniper' ||
     occupant.type === 'tesla' || occupant.type === 'frost' || occupant.type === 'toxic');

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
    
    // Deterministic check to spawn some water puddles (e.g., 20% of patches)
    const isPuddle = p.dark && ((Math.floor(p.x + p.y) % 5) === 0);
    
    if (isPuddle) {
      ctx.save();
      const time = performance.now();
      
      // 1. Drop shadow / muddy grass rim
      ctx.fillStyle = 'rgba(25, 35, 20, 0.38)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 2.5, p.r * 0.92, p.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      
      // 2. Water fill with depth (radial gradient - deep in center, lighter at edges)
      const waterGrad = ctx.createRadialGradient(s.x, s.y - p.r * 0.08, p.r * 0.05, s.x, s.y, p.r * 0.86);
      const cCenter = mixHex('#1f333d', '#0b1318', dayNight.factor); // deep reflection
      const cEdge = mixHex('#4b6572', '#22323a', dayNight.factor); // shore reflection
      waterGrad.addColorStop(0, cCenter);
      waterGrad.addColorStop(1, cEdge);
      ctx.fillStyle = waterGrad;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, p.r * 0.86, p.r * 0.54, 0, 0, Math.PI * 2); ctx.fill();
      
      // 3. Specular highlight ripple line (animated/moving gently over time)
      const waveShift = Math.sin(time * 0.0012 + p.x) * 0.06;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.x - p.r * (0.15 + waveShift), s.y - p.r * 0.1, p.r * 0.45, Math.PI * 1.05, Math.PI * 1.45);
      ctx.stroke();
      
      // 4. Secondary minor reflection lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - p.r * 0.4, s.y + p.r * 0.15);
      ctx.lineTo(s.x - p.r * 0.1, s.y + p.r * 0.15);
      ctx.stroke();

      // 5. Shimmering water glitter sparkles
      const shimmer = Math.sin(time * 0.0028 + p.x * 0.07) * 0.5 + 0.5;
      if (shimmer > 0.45) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(shimmer - 0.45) * 0.45 * (1 - dayNight.factor * 0.5)})`;
        ctx.beginPath();
        ctx.ellipse(s.x + p.r * 0.18, s.y - p.r * 0.18, 3.2, 1.5, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Expandable ripple ring effect
      const ripplePhase = (time * 0.0006 + p.x * 0.05) % 1.0;
      const rippleRadius = p.r * 0.2 + ripplePhase * p.r * 0.6;
      const rippleAlpha = (1.0 - ripplePhase) * 0.25 * (1 - dayNight.factor * 0.4);
      ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha})`; ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, rippleRadius, rippleRadius * 0.54, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    } else {
      // Lush grass shading patch (feathered radial gradient)
      const grad = ctx.createRadialGradient(s.x, s.y, p.r * 0.1, s.x, s.y, p.r);
      if (p.dark) {
        grad.addColorStop(0, 'rgba(30, 42, 18, 0.42)');  // mossy damp soil
        grad.addColorStop(0.6, 'rgba(45, 60, 25, 0.22)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        grad.addColorStop(0, 'rgba(150, 185, 70, 0.20)'); // lush green grass clump
        grad.addColorStop(0.6, 'rgba(130, 170, 65, 0.08)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, p.r * 1.1, p.r * 0.77, 0, 0, Math.PI * 2); ctx.fill();

      // Wildflowers scattered on some green patches
      const hasFlowers = !p.dark && ((Math.floor(p.x) % 3) === 0);
      if (hasFlowers) {
        const flowerSeed = Math.abs(Math.sin(p.x * 12.9 + p.y * 3.4) * 10);
        ctx.fillStyle = (Math.floor(flowerSeed) % 2 === 0) ? '#ffe082' : '#ff8a80'; // soft yellow or coral flowers
        for (let f = 0; f < 3; f++) {
          const fx = s.x + Math.sin(flowerSeed + f * 2.5) * (p.r * 0.35);
          const fy = s.y + Math.cos(flowerSeed + f * 1.8) * (p.r * 0.28);
          // Flower bloom dot
          ctx.beginPath(); ctx.arc(fx, fy, 2.0, 0, Math.PI * 2); ctx.fill();
          // Yellow core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(fx, fy, 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = (Math.floor(flowerSeed) % 2 === 0) ? '#ffe082' : '#ff8a80';
        }
      }
    }
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

  // Swaying grass tufts, pebbles, and autumn fallen leaves
  const time = performance.now();
  for (const d of decor) {
    const s = worldToScreen(d.x, d.y);
    if (s.x < -20 || s.x > canvas.width + 20 || s.y < -20 || s.y > canvas.height + 20) continue;
    
    ctx.save();
    ctx.translate(s.x, s.y);
    
    const typeIndex = Math.floor(d.x + d.y) % 6;
    if (typeIndex === 0) {
      // 1. Fallen Autumn/Green Leaf on floor
      const rot = d.a + Math.sin(time * 0.0004 + d.x) * 0.1; // slow soft sway
      ctx.rotate(rot);
      // Shadow
      ctx.fillStyle = 'rgba(10,25,12,0.12)';
      ctx.beginPath(); ctx.ellipse(1, 1, 4 * d.s, 2 * d.s, Math.PI * 0.25, 0, Math.PI * 2); ctx.fill();
      // Leaf body
      ctx.fillStyle = (Math.floor(d.x) % 2 === 0) ? '#b05c38' : '#cd9b4d'; // copper/amber leaf
      ctx.beginPath(); ctx.ellipse(0, 0, 3.8 * d.s, 1.8 * d.s, Math.PI * 0.25, 0, Math.PI * 2); ctx.fill();
      // Stem line
      ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-3 * d.s, -1 * d.s); ctx.lineTo(3 * d.s, 1 * d.s); ctx.stroke();
    } else if (typeIndex === 1) {
      // 2. Small Pebble
      // Shadow
      ctx.fillStyle = 'rgba(10,20,15,0.16)';
      ctx.beginPath(); ctx.ellipse(1, 1, 3.2 * d.s, 1.8 * d.s, 0, 0, Math.PI * 2); ctx.fill();
      // Pebble body
      ctx.fillStyle = '#85929e';
      ctx.beginPath(); ctx.ellipse(0, 0, 2.8 * d.s, 1.5 * d.s, 0.15, 0, Math.PI * 2); ctx.fill();
      // Shimmer highlight
      ctx.fillStyle = '#aeb6bf';
      ctx.beginPath(); ctx.ellipse(-0.6, -0.3, 1.2 * d.s, 0.7 * d.s, 0.15, 0, Math.PI * 2); ctx.fill();
    } else {
      // 3. Classic Swaying Grass Tufts
      ctx.fillStyle = mixHex(TUFT_DAY, TUFT_NIGHT, dayNight.factor);
      const sway = Math.sin(time * 0.0018 + d.x * 0.04 + d.y * 0.04) * 0.14;
      ctx.rotate(d.a + sway);
      const bladeLen = 9 * d.s;

      // Small blade base shadow to add 3D depth
      ctx.fillStyle = 'rgba(10, 25, 12, 0.16)';
      ctx.beginPath(); ctx.ellipse(0, 0, 4.5 * d.s, 1.5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = mixHex(TUFT_DAY, TUFT_NIGHT, dayNight.factor);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        const bx = i * 3 * d.s;
        ctx.moveTo(bx - 1.5, 0);
        ctx.lineTo(bx, -bladeLen * (1 - Math.abs(i) * 0.25));
        ctx.lineTo(bx + 1.5, 0);
      }
      ctx.fill();
    }
    ctx.restore();
  }



  // Day floating pollen
  if (dayNight.factor <= 0.25) {
    const a = (1 - dayNight.factor * 4) * 0.35;
    ctx.fillStyle = `rgba(255,255,210,${a})`;
    for (let i = 0; i < 16; i++) {
      const px = (i * 713 + Math.sin(time * 0.0008 + i) * 50) % canvas.width;
      const py = (i * 324 + time * 0.012 + Math.cos(time * 0.0006 + i) * 30) % canvas.height;
      ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (dayNight.factor > 0.25) {
    for (const f of fireflies) {
      const s = worldToScreen(f.x, f.y + Math.sin(time * f.speed + f.phase) * 10);
      if (s.x < -10 || s.x > canvas.width + 10 || s.y < -10 || s.y > canvas.height + 10) continue;
      const a = Math.min(1, dayNight.factor * 1.4) * (0.5 + 0.5 * Math.sin(time * 0.003 + f.phase * 3));
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

  const OUTLINE = '#111815';

  if (r.type === 'tree') {
    if (imgTree.complete && imgTree.naturalWidth !== 0) {
      // Deterministic size (scale) and rotation variation based on coordinates seed
      const seed = (Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453) % 1);
      const scaleMul = 0.88 + seed * 0.24; // ±12% scale variation
      const rot = (seed - 0.5) * 0.12; // tilt slightly

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      ctx.scale(scaleMul, scaleMul);

      const dw = r.radius * 3.2;
      const dh = dw * (imgTree.naturalHeight / imgTree.naturalWidth);
      ctx.drawImage(imgTree, -dw / 2, -dh * 0.75, dw, dh);
      ctx.restore();
    } else {
      // 1. Drop shadow (extra dark and offset)
      ctx.fillStyle = 'rgba(10, 20, 12, 0.4)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + r.radius * 0.65, r.radius * 1.1, r.radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Branch extensions poking out between layers (drawn under foliage)
      ctx.strokeStyle = '#432f1f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      [-1, 1].forEach(side => {
        const bx = s.x + side * r.radius * 0.28;
        const by = s.y - r.radius * 0.05;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + r.radius * 0.25);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + side * r.radius * 0.3, by - r.radius * 0.22);
        ctx.stroke();
      });

      // 3. Gnarled trunk with roots (matches the wood block texture in the image)
      ctx.fillStyle = '#5c402c'; // warm dark brown
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Start top center
      ctx.moveTo(s.x - r.radius * 0.16, s.y + r.radius * 0.15);
      // Left trunk edge and root flare
      ctx.quadraticCurveTo(s.x - r.radius * 0.2, s.y + r.radius * 0.4, s.x - r.radius * 0.42, s.y + r.radius * 0.65);
      ctx.lineTo(s.x - r.radius * 0.24, s.y + r.radius * 0.65);
      // Center root flare
      ctx.quadraticCurveTo(s.x, s.y + r.radius * 0.48, s.x + r.radius * 0.24, s.y + r.radius * 0.65);
      ctx.lineTo(s.x + r.radius * 0.42, s.y + r.radius * 0.65);
      // Right trunk edge
      ctx.quadraticCurveTo(s.x + r.radius * 0.2, s.y + r.radius * 0.4, s.x + r.radius * 0.16, s.y + r.radius * 0.15);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Trunk wood grain lines
      ctx.strokeStyle = '#3a271a'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - r.radius * 0.06, s.y + r.radius * 0.22);
      ctx.quadraticCurveTo(s.x - r.radius * 0.08, s.y + r.radius * 0.45, s.x - r.radius * 0.15, s.y + r.radius * 0.6);
      ctx.moveTo(s.x + r.radius * 0.06, s.y + r.radius * 0.22);
      ctx.quadraticCurveTo(s.x + r.radius * 0.08, s.y + r.radius * 0.45, s.x + r.radius * 0.15, s.y + r.radius * 0.6);
      ctx.stroke();

      // 4. Multi-layered foliage canopy (as shown in reference image)
      const canopy = [
        { dx: -r.radius * 0.44, dy: r.radius * 0.12, rr: r.radius * 0.6 },
        { dx: r.radius * 0.44, dy: r.radius * 0.12, rr: r.radius * 0.6 },
        { dx: -r.radius * 0.42, dy: -r.radius * 0.32, rr: r.radius * 0.66 },
        { dx: r.radius * 0.42, dy: -r.radius * 0.32, rr: r.radius * 0.66 },
        { dx: 0, dy: -r.radius * 0.52, rr: r.radius * 0.72 },
        { dx: 0, dy: -r.radius * 0.08, rr: r.radius * 0.78 },
      ];

      // Pass 1: Draw dark borders/shadows for all canopy blobs
      ctx.fillStyle = OUTLINE;
      for (const b of canopy) {
        ctx.beginPath();
        ctx.arc(s.x + b.dx, s.y + b.dy, b.rr + 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pass 2: Draw base dark green fills
      for (const b of canopy) {
        ctx.fillStyle = '#1e3d24'; // deep dark base green
        ctx.beginPath();
        ctx.arc(s.x + b.dx, s.y + b.dy, b.rr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pass 3: Draw mid green radial layers
      for (const b of canopy) {
        ctx.fillStyle = radialFill(ctx, s.x + b.dx, s.y + b.dy, b.rr, '#35663e', '#1e3d24');
        ctx.beginPath();
        ctx.arc(s.x + b.dx, s.y + b.dy, b.rr - 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pass 4: Draw light-green top highlights (as sun shine hits from top-left)
      for (const b of canopy) {
        ctx.fillStyle = 'rgba(126, 191, 134, 0.45)';
        ctx.beginPath();
        ctx.arc(s.x + b.dx - b.rr * 0.16, s.y + b.dy - b.rr * 0.16, b.rr * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pass 5: Wavy leaf crease textures
      ctx.strokeStyle = 'rgba(15, 30, 20, 0.42)'; ctx.lineWidth = 1.8;
      for (const b of canopy) {
        ctx.beginPath();
        ctx.arc(s.x + b.dx + b.rr * 0.15, s.y + b.dy + b.rr * 0.15, b.rr * 0.5, Math.PI * 0.75, Math.PI * 1.25);
        ctx.stroke();
      }
    }
  } else if (r.type === 'iron') {
    if (imgIron.complete && imgIron.naturalWidth !== 0) {
      const seed = (Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453) % 1);
      const scaleMul = 0.88 + seed * 0.24;
      const rot = seed * Math.PI * 2;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      ctx.scale(scaleMul, scaleMul);

      const dw = r.radius * 2.8;
      const dh = dw * (imgIron.naturalHeight / imgIron.naturalWidth);
      ctx.drawImage(imgIron, -dw / 2, -dh * 0.58, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(10, 18, 14, 0.38)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + r.radius * 0.4, r.radius * 1.1, r.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#708090';
      ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, r.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  } else {
    if (imgStone.complete && imgStone.naturalWidth !== 0) {
      // Deterministic size (scale) and rotation variation based on coordinates seed
      const seed = (Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453) % 1);
      const scaleMul = 0.88 + seed * 0.24; // ±12% scale variation
      const rot = seed * Math.PI * 2; // full 360 degree rotation to make every rock pile shape unique

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      ctx.scale(scaleMul, scaleMul);

      const dw = r.radius * 2.7;
      const dh = dw * (imgStone.naturalHeight / imgStone.naturalWidth);
      ctx.drawImage(imgStone, -dw / 2, -dh * 0.58, dw, dh);
      ctx.restore();
    } else {
      // 1. Drop shadow
      ctx.fillStyle = 'rgba(10, 18, 14, 0.38)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + r.radius * 0.4, r.radius * 1.1, r.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Individual stones in the pile
      const stones = [
        { dx: -r.radius * 0.36, dy: r.radius * 0.2, rx: r.radius * 0.58, ry: r.radius * 0.48, rot: 0.15 },
        { dx: r.radius * 0.42, dy: r.radius * 0.25, rx: r.radius * 0.45, ry: r.radius * 0.38, rot: -0.3 },
        { dx: r.radius * 0.44, dy: -r.radius * 0.08, rx: r.radius * 0.34, ry: r.radius * 0.28, rot: 0.7 },
        { dx: -r.radius * 0.04, dy: -r.radius * 0.15, rx: r.radius * 0.78, ry: r.radius * 0.65, rot: -0.1 },
      ];

      // Pass 1: Draw stone thick outlines
      ctx.fillStyle = OUTLINE;
      for (const stone of stones) {
        ctx.save();
        ctx.translate(s.x + stone.dx, s.y + stone.dy);
        ctx.rotate(stone.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, stone.rx + 2.8, stone.ry + 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Pass 2: Draw stone bodies with grey granite gradients
      for (const stone of stones) {
        ctx.save();
        ctx.translate(s.x + stone.dx, s.y + stone.dy);
        ctx.rotate(stone.rot);
        
        ctx.fillStyle = radialFill(ctx, 0, 0, stone.rx, '#85929e', '#4d5656');
        ctx.beginPath();
        ctx.ellipse(0, 0, stone.rx, stone.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.ellipse(-stone.rx * 0.2, -stone.ry * 0.2, stone.rx * 0.5, stone.ry * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Moss spots on top (matches the green moss in the image)
        ctx.fillStyle = '#596e43'; // moss green
        ctx.beginPath();
        ctx.ellipse(-stone.rx * 0.12, -stone.ry * 0.38, stone.rx * 0.6, stone.ry * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner facet crease line (shading effect)
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-stone.rx * 0.55, -stone.ry * 0.08);
        ctx.lineTo(stone.rx * 0.18, -stone.ry * 0.22);
        ctx.lineTo(stone.rx * 0.48, stone.ry * 0.38);
        ctx.stroke();

        ctx.restore();
      }

      // 3. Crack lines running through the rock pile
      ctx.strokeStyle = '#1b2631'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(s.x - r.radius * 0.18, s.y - r.radius * 0.45);
      ctx.lineTo(s.x - r.radius * 0.04, s.y - r.radius * 0.08);
      ctx.lineTo(s.x - r.radius * 0.3, s.y + r.radius * 0.28);
      ctx.stroke();
    }
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
  const lvl = st.level || 1;

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
  } else if (st.type === 'cannon') {
    ctx.save();
    ctx.translate(s.x, s.y);
    
    const baseColors = ['#4a5a5e', '#597b7f', '#6a9a9e', '#3a7d8c', '#ffd76a'];
    ctx.fillStyle = baseColors[lvl - 1];
    ctx.strokeStyle = '#1c2426'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < lvl; i++) {
      const aDots = (i * Math.PI * 2) / lvl;
      ctx.beginPath(); ctx.arc(Math.cos(aDots) * (st.radius * 0.6), Math.sin(aDots) * (st.radius * 0.6), 2, 0, Math.PI * 2); ctx.fill();
    }
    
    const aimA = st.aimAngle ?? -Math.PI / 2;
    ctx.rotate(aimA + Math.PI / 2);
    ctx.fillStyle = '#2f3a3c';
    ctx.strokeStyle = '#1c2426'; ctx.lineWidth = 2.5;
    ctx.fillRect(-5, -st.radius - 8, 10, 11);
    ctx.strokeRect(-5, -st.radius - 8, 10, 11);
    ctx.fillStyle = lvl === 5 ? '#e74c3c' : '#ffd76a';
    ctx.fillRect(-6, -st.radius - 12, 12, 4);
    ctx.strokeRect(-6, -st.radius - 12, 12, 4);
    ctx.restore();
  } else if (st.type === 'mortar') {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = '#34495e';
    ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const edgeA = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(edgeA) * (st.radius - 3), Math.sin(edgeA) * (st.radius - 3));
      ctx.lineTo(Math.cos(edgeA + 0.15) * st.radius, Math.sin(edgeA + 0.15) * st.radius);
      ctx.stroke();
    }

    const aimA = st.aimAngle ?? -Math.PI / 2;
    ctx.rotate(aimA + Math.PI / 2);
    ctx.fillStyle = '#2c3e50';
    ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 2;
    ctx.fillRect(-7, -st.radius - 3, 14, 12);
    ctx.strokeRect(-7, -st.radius - 3, 14, 12);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, -st.radius - 1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (st.type === 'sniper') {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = '#7f8c8d';
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#34495e';
    ctx.beginPath(); ctx.arc(0, 0, st.radius * 0.6, 0, Math.PI * 2); ctx.fill();
    
    const aimA = st.aimAngle ?? -Math.PI / 2;
    ctx.rotate(aimA + Math.PI / 2);
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
    ctx.fillRect(-2, -st.radius - 16, 4, 18);
    ctx.strokeRect(-2, -st.radius - 16, 4, 18);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(0, -st.radius - 16, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (st.type === 'tesla') {
    ctx.save();
    ctx.translate(s.x, s.y);
    
    ctx.fillStyle = '#d35400';
    ctx.strokeStyle = '#873600'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, st.radius * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, st.radius * 0.45, 0, Math.PI * 2); ctx.stroke();
    
    ctx.fillStyle = '#5dade2';
    ctx.strokeStyle = '#2874a6'; ctx.lineWidth = 1.5;
    const pulseRadius = (st.radius * 0.3) + Math.sin(performance.now() * 0.015) * 1.5;
    ctx.beginPath(); ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    if (Math.random() < 0.35) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const angleSpark = Math.random() * Math.PI * 2;
      const sparkDist = st.radius * (0.4 + Math.random() * 0.45);
      ctx.lineTo(Math.cos(angleSpark) * sparkDist, Math.sin(angleSpark) * sparkDist);
      ctx.stroke();
    }
    ctx.restore();
  } else if (st.type === 'frost') {
    ctx.save();
    ctx.translate(s.x, s.y);
    
    const spec = TOWER_LEVELS.frost[lvl - 1];
    ctx.fillStyle = 'rgba(165, 243, 252, 0.04)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, spec.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#a5f3fc';
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, st.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const shardA = (i * Math.PI * 2) / 6;
      ctx.lineTo(Math.cos(shardA) * (st.radius * 0.8), Math.sin(shardA) * (st.radius * 0.8));
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (st.type === 'toxic') {
    ctx.save();
    ctx.translate(s.x, s.y);
    
    ctx.fillStyle = '#1e8449';
    ctx.strokeStyle = '#145a32'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#2ecc71';
    const nowBubble = performance.now();
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([ox, oy], i) => {
      const pRadius = 3 + Math.sin(nowBubble * 0.008 + i) * 1.0;
      ctx.beginPath(); ctx.arc(ox, oy, pRadius, 0, Math.PI * 2); ctx.fill();
    });
    
    const aimA = st.aimAngle ?? -Math.PI / 2;
    ctx.rotate(aimA + Math.PI / 2);
    ctx.fillStyle = '#27ae60';
    ctx.strokeStyle = '#145a32'; ctx.lineWidth = 2.0;
    ctx.fillRect(-4, -st.radius - 4, 8, 10);
    ctx.strokeRect(-4, -st.radius - 4, 8, 10);
    ctx.restore();
  } else if (st.type === 'factory') {
    const w = st.radius * 2.1, h = st.radius * 1.5;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang + Math.PI / 2);
    
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#78281f'; ctx.lineWidth = 4.0;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#922b21';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(-w / 4, -h / 2 - 8);
    ctx.lineTo(-w / 4, -h / 2);
    ctx.lineTo(0, -h / 2 - 8);
    ctx.lineTo(0, -h / 2);
    ctx.lineTo(w / 4, -h / 2 - 8);
    ctx.lineTo(w / 4, -h / 2);
    ctx.lineTo(w / 2, -h / 2 - 8);
    ctx.lineTo(w / 2, -h / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#7f8c8d';
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2.0;
    ctx.fillRect(-w * 0.3, -h / 2 - 14, 5, 12);
    ctx.strokeRect(-w * 0.3, -h / 2 - 14, 5, 12);
    ctx.fillRect(w * 0.2, -h / 2 - 14, 5, 12);
    ctx.strokeRect(w * 0.2, -h / 2 - 14, 5, 12);
    ctx.restore();
    
    if (Math.random() < 0.12) {
      const smokeX = s.x + (Math.random() < 0.5 ? -w * 0.3 : w * 0.2);
      const smokeY = s.y - h / 2 - 14;
      // We can push directly to particles! But since update is handled, let's just make it float up!
      // In drawWorld.ts, modifying particle array might cause race conditions during draw, so we can just draw small smoke puffs!
    }
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

  // Draw Level Badge Overlay
  if (st.type === 'cannon' || st.type === 'mortar' || st.type === 'sniper' || st.type === 'tesla' || st.type === 'frost' || st.type === 'toxic') {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 18, 14, 0.72)';
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.25)'; ctx.lineWidth = 1.0;
    roundRectPath(ctx, s.x - 14, s.y - st.radius - 23, 28, 9, 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.font = "bold 8px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('LV ' + lvl, s.x, s.y - st.radius - 16);
    ctx.restore();
  }
  if (st.hp < st.maxHp) {
    const w = st.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - w / 2, s.y - st.radius - 14, w, 5);
    ctx.fillStyle = '#e2b477'; ctx.fillRect(s.x - w / 2, s.y - st.radius - 14, w * (st.hp / st.maxHp), 5);
  }

  // Draw Selection Ring & Attack Range Overlay if inspected or hovered
  const mp = mouseWorldPos();
  const isHovered = dist(mp.x, mp.y, st.x, st.y) <= st.radius + 10;
  const isSelected = st === inspectedStructure;

  if (isSelected || isHovered) {
    ctx.save();
    // 1. Structure Selection Ring
    ctx.strokeStyle = isSelected ? '#ffd76a' : '#4ecdc4';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(s.x, s.y, st.radius + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // 2. Attack / Effect Range Circle
    let range: number | null = null;
    if (st.type === 'cannon' || st.type === 'mortar' || st.type === 'sniper' || st.type === 'tesla' || st.type === 'frost' || st.type === 'toxic') {
      const currentLevel = st.level || 1;
      const specList = TOWER_LEVELS[st.type];
      if (specList && specList[currentLevel - 1]) {
        range = specList[currentLevel - 1].range;
      }
    } else if (st.type === 'campfire') {
      range = st.healRadius || 150;
    }

    if (range) {
      ctx.strokeStyle = isSelected ? 'rgba(255, 215, 106, 0.75)' : 'rgba(78, 205, 196, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(s.x, s.y, range, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = isSelected ? 'rgba(255, 215, 106, 0.06)' : 'rgba(78, 205, 196, 0.04)';
      ctx.beginPath(); ctx.arc(s.x, s.y, range, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

export function drawBuildPreview(ctx: CanvasRenderingContext2D): void {
  if (!player.alive || shopOpen || !selectedBuild || findNearestShop(80)) return;

  const target = getBuildTarget();
  const s = worldToScreen(target.cx, target.cy);
  const half = TILE / 2;

  let color = '#8bd17c';
  let label = '';

  if (target.occupant && target.canUpgrade) {
    if (target.occupant.type === 'wall' || target.occupant.type === 'spike') {
      const tiers = STRUCTURE_TIERS[target.occupant.type];
      const next = tiers[(target.occupant.tier || 0) + 1];
      if (next) { color = '#4ecdc4'; label = 'UPGRADE  ' + next.pointsCost + ' pts'; }
      else { color = '#8bd17c'; label = 'MAX TIER'; }
    } else if (target.occupant.type === 'cannon' || target.occupant.type === 'mortar' || target.occupant.type === 'sniper' || target.occupant.type === 'tesla' || target.occupant.type === 'frost' || target.occupant.type === 'toxic') {
      const lvl = target.occupant.level || 1;
      if (lvl < 5) {
        const levels = TOWER_LEVELS[target.occupant.type];
        const nextSpec = levels[lvl];
        const costInfo = nextSpec.cost;
        if (costInfo) {
          color = '#ffd76a';
          label = 'UPGRADE  ' + costInfo.amount + ' ' + costInfo.resource;
        }
      } else {
        color = '#8bd17c';
        label = 'MAX LEVEL';
      }
    }
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
    if (selectedBuild === 'cannon' || selectedBuild === 'mortar' || selectedBuild === 'sniper' || selectedBuild === 'tesla' || selectedBuild === 'frost' || selectedBuild === 'toxic') {
      ghost.aimAngle = ghostAngle;
      ghost.level = 1;
    }
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

export function drawFireZones(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  ctx.save();
  for (const fz of fireZones) {
    const s = worldToScreen(fz.x, fz.y);
    const pulse = 1 + 0.08 * Math.sin(now * 0.01 + fz.x);
    const grad = ctx.createRadialGradient(s.x, s.y, fz.radius * 0.1, s.x, s.y, fz.radius * pulse);
    grad.addColorStop(0, 'rgba(255, 100, 30, 0.42)');
    grad.addColorStop(0.5, 'rgba(230, 70, 10, 0.22)');
    grad.addColorStop(1, 'rgba(150, 20, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(s.x, s.y, fz.radius * pulse, 0, Math.PI * 2); ctx.fill();
    
    if (Math.random() < 0.15) {
      const sparkA = Math.random() * Math.PI * 2;
      const sparkD = Math.random() * fz.radius * 0.7;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath(); ctx.arc(s.x + Math.cos(sparkA) * sparkD, s.y + Math.sin(sparkA) * sparkD, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawToxicClouds(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  ctx.save();
  for (const tc of toxicClouds) {
    const s = worldToScreen(tc.x, tc.y);
    const pulse = 1 + 0.05 * Math.sin(now * 0.007 + tc.x);
    const grad = ctx.createRadialGradient(s.x, s.y, tc.radius * 0.2, s.x, s.y, tc.radius * pulse);
    grad.addColorStop(0, 'rgba(46, 204, 113, 0.32)');
    grad.addColorStop(0.6, 'rgba(39, 174, 96, 0.16)');
    grad.addColorStop(1, 'rgba(20, 90, 50, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(s.x, s.y, tc.radius * pulse, 0, Math.PI * 2); ctx.fill();
    
    if (Math.random() < 0.1) {
      const bubbleA = Math.random() * Math.PI * 2;
      const bubbleD = Math.random() * tc.radius * 0.8;
      ctx.fillStyle = 'rgba(46, 204, 113, 0.45)';
      ctx.beginPath(); ctx.arc(s.x + Math.cos(bubbleA) * bubbleD, s.y + Math.sin(bubbleA) * bubbleD, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawSniperLasers(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  ctx.save();
  for (const sl of sniperLasers) {
    const s = worldToScreen(sl.sx, sl.sy);
    const t = worldToScreen(sl.tx, sl.ty);
    const alpha = Math.max(0, (sl.endsAt - now) / 150);
    
    ctx.strokeStyle = `rgba(255, 92, 92, ${alpha * 0.65})`; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
  }
  ctx.restore();
}

export function drawTeslaChains(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  ctx.save();
  for (const tc of teslaChains) {
    const alpha = Math.max(0, (tc.endsAt - now) / 100);
    
    ctx.strokeStyle = `rgba(137, 207, 240, ${alpha * 0.9})`; ctx.shadowColor = '#89cff0'; ctx.shadowBlur = 8;
    for (const seg of tc.segments) {
      const s = worldToScreen(seg.sx, seg.sy);
      const t = worldToScreen(seg.tx, seg.ty);
      
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const len = Math.hypot(dx, dy);
      const steps = Math.max(3, Math.floor(len / 15));
      
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      for (let i = 1; i < steps; i++) {
        const tVal = i / steps;
        const px = s.x + dx * tVal;
        const py = s.y + dy * tVal;
        
        const normalX = -dy / len;
        const normalY = dx / len;
        const offset = (Math.random() - 0.5) * 8.5;
        
        ctx.lineTo(px + normalX * offset, py + normalY * offset);
      }
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
