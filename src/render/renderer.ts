import {
  camera, player, resources, crates, powerups, structures, zombies,
  shake, bloodMoon, dayNight
} from '../state';
import { WORLD_W, WORLD_H } from '../constants';
import { clamp, rand } from '../utils';
import {
  drawBackground, drawWorldBounds, drawResource, drawCrate, drawStructure,
  drawBuildPreview, drawStars, drawMinimap, worldToScreen,
  drawFireZones, drawToxicClouds, drawSniperLasers, drawTeslaChains
} from './drawWorld';
import { drawZombie } from './drawZombie';
import { drawBullets, drawPlayer, drawParticles, drawPowerup } from './drawPlayer';

export function drawNightOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  if (bloodMoon.active) {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const grad = ctx.createRadialGradient(cx, cy, canvas.height * 0.18, cx, cy, canvas.height * 0.85);
    grad.addColorStop(0, 'rgba(40,4,4,0.10)');
    grad.addColorStop(1, 'rgba(28,2,2,0.70)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (dayNight.factor <= 0.02) return;
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy, canvas.height * 0.18, cx, cy, canvas.height * 0.85);
  grad.addColorStop(0, `rgba(10,15,35,${0.04 * dayNight.factor})`);
  grad.addColorStop(1, `rgba(5,8,22,${0.72 * dayNight.factor})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawFlashlight(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  if (bloodMoon.active) {
    const s = worldToScreen(player.x, player.y);
    const angle = player.angle;
    const len = 620, spread = 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.arc(s.x, s.y, len, angle - spread, angle + spread);
    ctx.closePath();
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, len);
    grad.addColorStop(0, 'rgba(255,40,40,0.24)');
    grad.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    return;
  }
  if (dayNight.factor < 0.35) return;
  const s = worldToScreen(player.x, player.y);
  const angle = player.angle;
  const len = 620, spread = 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.arc(s.x, s.y, len, angle - spread, angle + spread);
  ctx.closePath();
  const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, len);
  grad.addColorStop(0, `rgba(255,244,214,${0.2 * dayNight.factor})`);
  grad.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  // Center camera directly on player to preserve true FOV and mouse alignment
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  if (shake.time > 0) {
    camera.x += rand(-shake.mag, shake.mag);
    camera.y += rand(-shake.mag, shake.mag);
  }

  drawBackground(ctx, canvas);
  drawWorldBounds(ctx);
  
  // Lingering area of effect drawing
  drawFireZones(ctx);
  drawToxicClouds(ctx);

  for (const r of resources) drawResource(ctx, canvas, r);
  for (const c of crates) drawCrate(ctx, c);
  for (const p of powerups) drawPowerup(ctx, canvas, p);
  for (const st of structures) drawStructure(ctx, st);
  drawBuildPreview(ctx);
  for (const z of zombies) drawZombie(ctx, canvas, z);
  drawBullets(ctx);
  drawPlayer(ctx);
  drawParticles(ctx);

  // Tower instant attack tracers
  drawSniperLasers(ctx);
  drawTeslaChains(ctx);

  drawStars(ctx, canvas);
  drawNightOverlay(ctx, canvas);
  drawFlashlight(ctx, canvas);

  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.35, canvas.width / 2, canvas.height / 2, canvas.height * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMinimap(ctx, canvas);
}
