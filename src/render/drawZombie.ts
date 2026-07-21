import { Zombie, Vec2 } from '../types';
import { ZTYPE, ARM_SHADOW } from '../constants';
import { player } from '../state';
import { worldToScreen, radialFill, drawShadow } from './drawWorld';

export function def_ranged(z: Zombie): boolean {
  return !!ZTYPE[z.type].ranged;
}

export function drawZombieArmBlobs(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, radius: number,
  angle: number, spread: number, reach: number, bodyCol: string,
  bodyCol2: string, OUTLINE: string, flashing: boolean
): void {
  const armColor = flashing ? '#ffffff' : ARM_SHADOW;
  [-1, 1].forEach(side => {
    const armAngle = angle + side * spread;
    const blobDist = radius * reach;
    const bx = sx + Math.cos(armAngle) * blobDist, by = sy + Math.sin(armAngle) * blobDist;
    const blobR = radius * 0.52;

    ctx.strokeStyle = OUTLINE; ctx.lineCap = 'round'; ctx.lineWidth = radius * 0.6 + 5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = armColor; ctx.lineWidth = radius * 0.6;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle = flashing ? '#ffffff' : radialFill(ctx, bx, by, blobR, bodyCol, bodyCol2);
    ctx.beginPath(); ctx.arc(bx, by, blobR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(bx - blobR * 0.3, by - blobR * 0.35, blobR * 0.32, blobR * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawBossZombie(ctx: CanvasRenderingContext2D, z: Zombie, s: Vec2, angle: number, flashing: boolean, OUTLINE: string): void {
  const r = z.radius;
  const bodyCol = flashing ? '#ffffff' : z.skinColor;
  const bodyCol2 = flashing ? '#ffffff' : z.skinColor2;

  [-1, 1].forEach(side => {
    const a = angle + side * Math.PI / 2.1;
    const px = s.x + Math.cos(a) * r * 0.95, py = s.y + Math.sin(a) * r * 0.95;
    ctx.fillStyle = '#5c4a34';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(px, py, r * 0.42, r * 0.36, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3f3222';
    ctx.beginPath(); ctx.ellipse(px, py, r * 0.22, r * 0.18, a, 0, Math.PI * 2); ctx.fill();
  });

  [-0.62, 0.62].forEach(off => {
    const a = angle + off;
    const ax = s.x + Math.cos(a) * r * 0.95, ay = s.y + Math.sin(a) * r * 0.95;
    ctx.fillStyle = bodyCol2;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, r * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e2d0';
    for (let i = -1; i <= 1; i++) {
      const fa = a + i * 0.4;
      const fx = ax + Math.cos(fa) * r * 0.34, fy = ay + Math.sin(fa) * r * 0.34;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(fa) * 10, fy + Math.sin(fa) * 10);
      ctx.lineTo(fx + Math.cos(fa + 0.25) * 4, fy + Math.sin(fa + 0.25) * 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  });

  for (let i = 0; i < 9; i++) {
    const a = angle + i / 9 * Math.PI * 2;
    ctx.fillStyle = '#7c3aed';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
    ctx.lineTo(s.x + Math.cos(a + 0.16) * (r + 18), s.y + Math.sin(a + 0.16) * (r + 18));
    ctx.lineTo(s.x + Math.cos(a - 0.16) * (r + 18), s.y + Math.sin(a - 0.16) * (r + 18));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  ctx.fillStyle = radialFill(ctx, s.x, s.y, r, bodyCol, bodyCol2);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r * 0.98, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4.5; ctx.stroke();

  // Boss Purple Cracks
  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(s.x - Math.cos(angle) * r * 0.4, s.y - Math.sin(angle) * r * 0.4);
  ctx.lineTo(s.x + Math.cos(angle + 0.5) * r * 0.1, s.y + Math.sin(angle + 0.5) * r * 0.1);
  ctx.lineTo(s.x + Math.cos(angle - 0.5) * r * 0.4, s.y + Math.sin(angle - 0.5) * r * 0.4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 7; i++) {
    const a = angle + i * 2.44 + i * i * 0.7;
    const rr = r * (0.35 + (i % 3) * 0.16);
    const mx = s.x + Math.cos(a) * rr, my = s.y + Math.sin(a) * rr;
    ctx.beginPath(); ctx.ellipse(mx, my, r * 0.13, r * 0.09, a, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath(); ctx.ellipse(s.x - r * 0.32, s.y - r * 0.38, r * 0.34, r * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();

  const snoutX = s.x + Math.cos(angle) * r * 0.78, snoutY = s.y + Math.sin(angle) * r * 0.78;
  ctx.fillStyle = radialFill(ctx, snoutX, snoutY, r * 0.5, bodyCol2, z.skinDark);
  ctx.beginPath(); ctx.ellipse(snoutX, snoutY, r * 0.46, r * 0.34, angle, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  ctx.fillStyle = '#f0ead6'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  [-0.55, 0.55].forEach(off => {
    const a = angle + off;
    const bx = snoutX + Math.cos(a) * r * 0.3, by = snoutY + Math.sin(a) * r * 0.3;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + Math.cos(angle) * 14, by + Math.sin(angle) * 14 - 10, bx + Math.cos(angle) * 22, by + Math.sin(angle) * 22 - 16);
    ctx.lineTo(bx + Math.cos(angle) * 10, by + Math.sin(angle) * 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });

  ctx.fillStyle = z.skinDark;
  [-0.3, 0.3].forEach(off => {
    const a = angle + off;
    const nx = snoutX + Math.cos(a) * r * 0.32 + Math.cos(angle) * r * 0.14, ny = snoutY + Math.sin(a) * r * 0.32 + Math.sin(angle) * r * 0.14;
    ctx.beginPath(); ctx.ellipse(nx, ny, r * 0.06, r * 0.04, angle, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = '#e8e2d0'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  [-0.95, 0.95].forEach(off => {
    const ha = angle + off;
    const bx = s.x + Math.cos(ha) * r * 0.75, by = s.y + Math.sin(ha) * r * 0.75;
    const tx = s.x + Math.cos(ha) * r * 1.55, ty = s.y + Math.sin(ha) * r * 1.55;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + Math.cos(ha + 0.6) * 20, by + Math.sin(ha + 0.6) * 20, tx, ty);
    ctx.lineTo(bx + Math.cos(ha - 0.25) * 14, by + Math.sin(ha - 0.25) * 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });

  ctx.fillStyle = bodyCol2; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  [angle - Math.PI / 2, angle + Math.PI / 2].forEach(a => {
    const ex = s.x + Math.cos(a) * r * 0.9, ey = s.y + Math.sin(a) * r * 0.9;
    const tx = s.x + Math.cos(a) * r * 1.2, ty = s.y + Math.sin(a) * r * 1.2;
    ctx.beginPath();
    ctx.moveTo(ex - 8, ey - 8);
    ctx.lineTo(tx, ty);
    ctx.lineTo(ex + 8, ey + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });

  ctx.fillStyle = '#ff3b3b';
  [angle - 0.4, angle + 0.4].forEach(a => {
    const ex = s.x + Math.cos(a) * r * 0.34, ey = s.y + Math.sin(a) * r * 0.34;
    ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.11, r * 0.06, angle, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0a0a'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(angle) * 8 + Math.sin(angle) * 6 * (a < angle ? 1 : -1), ey - Math.sin(angle) * 8 - Math.cos(angle) * 6 * (a < angle ? 1 : -1));
    ctx.lineTo(ex + Math.cos(angle) * 8 + Math.sin(angle) * 6 * (a < angle ? 1 : -1), ey + Math.sin(angle) * 8 - Math.cos(angle) * 6 * (a < angle ? 1 : -1));
    ctx.stroke();
  });

  const mx = snoutX + Math.cos(angle) * r * 0.2, my = snoutY + Math.sin(angle) * r * 0.2;
  ctx.fillStyle = '#1a0a0a';
  ctx.beginPath(); ctx.ellipse(mx, my, r * 0.26, r * 0.14, angle, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#f0ead6';
  for (let i = -2; i <= 2; i++) {
    const ta = angle + Math.PI / 2;
    const tx2 = mx + Math.cos(ta) * i * r * 0.09, ty2 = my + Math.sin(ta) * i * r * 0.09;
    ctx.beginPath();
    ctx.moveTo(tx2 - 4, ty2);
    ctx.lineTo(tx2, ty2 + 8);
    ctx.lineTo(tx2 + 4, ty2);
    ctx.closePath(); ctx.fill();
  }
}

export function drawWolfZombie(
  ctx: CanvasRenderingContext2D, z: Zombie, s: Vec2, angle: number, flashing: boolean, OUTLINE: string
): void {
  const r = z.radius;
  const bodyCol = flashing ? '#ffffff' : z.skinColor;
  const bodyCol2 = flashing ? '#ffffff' : z.skinColor2;
  const legCol = flashing ? '#ffffff' : z.skinDark;
  const fx = Math.cos(angle), fy = Math.sin(angle);
  const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);

  // Tail — curves back and slightly to one side from the rear of the body.
  const tailBaseX = s.x - fx * r * 0.85, tailBaseY = s.y - fy * r * 0.85;
  const tailTipX = s.x - fx * r * 1.8 + px * r * 0.3, tailTipY = s.y - fy * r * 1.8 + py * r * 0.3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = r * 0.34 + 4;
  ctx.beginPath(); ctx.moveTo(tailBaseX, tailBaseY); ctx.quadraticCurveTo(s.x - fx * r * 1.5, s.y - fy * r * 1.5, tailTipX, tailTipY); ctx.stroke();
  ctx.strokeStyle = legCol; ctx.lineWidth = r * 0.34;
  ctx.beginPath(); ctx.moveTo(tailBaseX, tailBaseY); ctx.quadraticCurveTo(s.x - fx * r * 1.5, s.y - fy * r * 1.5, tailTipX, tailTipY); ctx.stroke();
  ctx.lineCap = 'butt';

  // Four legs — front pair toward the head end, back pair toward the tail end,
  // each splayed out to the side, with a small paw at the foot.
  ([[0.5, 1], [0.5, -1], [-0.45, 1], [-0.45, -1]] as [number, number][]).forEach(([along, side]) => {
    const hipX = s.x + fx * r * along, hipY = s.y + fy * r * along;
    const footX = hipX + px * r * 0.55 * side, footY = hipY + py * r * 0.55 * side;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = r * 0.3 + 4;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(footX, footY); ctx.stroke();
    ctx.strokeStyle = legCol; ctx.lineWidth = r * 0.3;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(footX, footY); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = OUTLINE;
    ctx.beginPath(); ctx.arc(footX, footY, r * 0.14, 0, Math.PI * 2); ctx.fill();
  });

  // Elongated body, long axis along the facing direction — reads as a
  // quadruped silhouette from above instead of the humanoid round body.
  ctx.fillStyle = radialFill(ctx, s.x, s.y, r, bodyCol, bodyCol2);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 1.05, r * 0.68, angle, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  // Spine stripe and a highlight patch for fur texture/depth.
  ctx.lineCap = 'round';
  ctx.strokeStyle = legCol; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.moveTo(s.x - fx * r * 0.75, s.y - fy * r * 0.75); ctx.lineTo(s.x + fx * r * 0.55, s.y + fy * r * 0.55); ctx.stroke();
  ctx.lineCap = 'butt';

  // Spine fur spikes
  ctx.fillStyle = legCol;
  [-0.3, 0, 0.3].forEach(off => {
    const furAngle = angle + Math.PI + off;
    const fux = s.x + Math.cos(furAngle) * r * 0.68;
    const fuy = s.y + Math.sin(furAngle) * r * 0.68;
    ctx.beginPath(); ctx.arc(fux, fuy, r * 0.15, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(s.x - px * r * 0.3 + fx * r * 0.1, s.y - py * r * 0.3 + fy * r * 0.1, r * 0.28, r * 0.16, angle, 0, Math.PI * 2); ctx.fill();

  // Head/snout, offset forward and tapered toward the facing direction.
  const headX = s.x + fx * r * 0.95, headY = s.y + fy * r * 0.95;
  ctx.fillStyle = radialFill(ctx, headX, headY, r * 0.55, bodyCol2, z.skinDark);
  ctx.beginPath(); ctx.ellipse(headX, headY, r * 0.5, r * 0.36, angle, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();

  // Ears — small triangles on top of the head.
  ctx.fillStyle = legCol; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  [-1, 1].forEach(side => {
    const a = angle + side * 0.5;
    const bx = headX + Math.cos(a) * r * 0.3, by = headY + Math.sin(a) * r * 0.3;
    const tx = headX + Math.cos(a) * r * 0.7, ty = headY + Math.sin(a) * r * 0.7;
    ctx.beginPath();
    ctx.moveTo(bx - px * r * 0.1 * side, by - py * r * 0.1 * side);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + px * r * 0.1 * side, by + py * r * 0.1 * side);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });

  // Glowing eyes — distinguishes it at a glance from the white-eyed humanoid zombies.
  ctx.fillStyle = flashing ? '#ffffff' : '#ffcf4d';
  [-1, 1].forEach(side => {
    const ex = headX + fx * r * 0.15 + px * r * 0.22 * side;
    const ey = headY + fy * r * 0.15 + py * r * 0.22 * side;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.09, 0, Math.PI * 2); ctx.fill();
  });

  // Open snarling mouth with fangs at the snout tip.
  const snoutX = headX + fx * r * 0.42, snoutY = headY + fy * r * 0.42;
  ctx.fillStyle = '#1a0a0a';
  ctx.beginPath(); ctx.ellipse(snoutX, snoutY, r * 0.22, r * 0.13, angle, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0ead6';
  [-1, 1].forEach(side => {
    const tx = snoutX + px * r * 0.12 * side, ty = snoutY + py * r * 0.12 * side;
    ctx.beginPath();
    ctx.moveTo(tx - px * r * 0.04 * side, ty - py * r * 0.04 * side);
    ctx.lineTo(tx + fx * r * 0.14, ty + fy * r * 0.14);
    ctx.lineTo(tx + px * r * 0.04 * side, ty + py * r * 0.04 * side);
    ctx.closePath(); ctx.fill();
  });
}

export function drawZombie(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, z: Zombie): void {
  const s = worldToScreen(z.x, z.y);
  if (s.x < -110 || s.x > canvas.width + 110 || s.y < -110 || s.y > canvas.height + 110) return;
  const angle = Math.atan2(player.y - z.y, player.x - z.x);
  const flashing = performance.now() - z.flash < 90;
  const OUTLINE = '#141f18';
  const bodyCol = flashing ? '#ffffff' : z.skinColor;
  const bodyCol2 = flashing ? '#ffffff' : z.skinColor2;

  drawShadow(ctx, s.x, s.y, z.radius);

  if (z.type === 'boss') {
    drawBossZombie(ctx, z, s, angle, flashing, OUTLINE);
    const barW2 = z.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - barW2 / 2, s.y - z.radius - 18, barW2, 6);
    ctx.fillStyle = '#c084fc'; ctx.fillRect(s.x - barW2 / 2, s.y - z.radius - 18, barW2 * (z.hp / z.maxHp), 6);
    return;
  }

  if (z.type === 'wolf') {
    drawWolfZombie(ctx, z, s, angle, flashing, OUTLINE);
    const barW3 = z.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - barW3 / 2, s.y - z.radius - 12, barW3, 5);
    ctx.fillStyle = '#ff5c5c'; ctx.fillRect(s.x - barW3 / 2, s.y - z.radius - 12, barW3 * (z.hp / z.maxHp), 5);
    return;
  }

  if (z.type === 'spider') {
    drawSpiderZombie(ctx, z, s, angle, flashing, OUTLINE);
    const barW = z.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW, 5);
    ctx.fillStyle = '#ff5c5c'; ctx.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW * (z.hp / z.maxHp), 5);
    return;
  }

  if (z.type === 'witch') {
    drawWitchZombie(ctx, z, s, angle, flashing, OUTLINE);
    const barW = z.radius * 2;
    ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW, 5);
    ctx.fillStyle = '#ff5c5c'; ctx.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW * (z.hp / z.maxHp), 5);
    return;
  }

  if (z.type === 'brute') {
    ctx.fillStyle = z.skinDark;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    [-0.7, 0.7].forEach(off => {
      const a = angle + off - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(angle + off) * z.radius * 0.7, s.y + Math.sin(angle + off) * z.radius * 0.7);
      ctx.lineTo(s.x + Math.cos(angle + off) * z.radius * 0.7 + Math.cos(a) * 10, s.y + Math.sin(angle + off) * z.radius * 0.7 + Math.sin(a) * 10);
      ctx.lineTo(s.x + Math.cos(angle + off) * z.radius * 1.05, s.y + Math.sin(angle + off) * z.radius * 1.05);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }

  const armSpread = def_ranged(z) ? 0.62 : 0.48;
  const armReach = def_ranged(z) ? 0.8 : 0.88;
  drawZombieArmBlobs(ctx, s.x, s.y, z.radius, angle, armSpread, armReach, bodyCol, bodyCol2, OUTLINE, flashing);

  // Spitter acid hand drips
  if (z.type === 'spitter') {
    ctx.fillStyle = 'rgba(46, 204, 113, 0.75)';
    [-1, 1].forEach(side => {
      const armAngle = angle + side * armSpread;
      const hx = s.x + Math.cos(armAngle) * z.radius * armReach;
      const hy = s.y + Math.sin(armAngle) * z.radius * armReach;
      ctx.beginPath(); ctx.arc(hx + Math.sin(performance.now() * 0.008) * 3, hy + 4, 3.5, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (z.type === 'spitter') {
    ctx.fillStyle = flashing ? '#ffffff' : '#437040';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x - Math.cos(angle) * z.radius * 0.5, s.y - Math.sin(angle) * z.radius * 0.5, z.radius * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  if (z.clothColor) {
    ctx.fillStyle = z.clothColor;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y + z.radius * 0.55, z.radius * 0.68, 0, Math.PI);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  const rx = z.radius * z.squishX, ry = z.radius * z.squishY;
  ctx.fillStyle = radialFill(ctx, s.x, s.y, z.radius, bodyCol, bodyCol2);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.stroke();

  // Rotting skin spots
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 3; i++) {
    const offX = Math.sin(i * 1.5) * z.radius * 0.35;
    const offY = Math.cos(i * 1.5) * z.radius * 0.35;
    ctx.beginPath(); ctx.arc(s.x + offX, s.y + offY, z.radius * 0.11, 0, Math.PI * 2); ctx.fill();
  }

  // Scout Headband
  if (z.type === 'scout') {
    ctx.fillStyle = '#e74c3c';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - z.radius * 0.25, z.radius * 0.9, z.radius * 0.16, angle, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  // Brute Chestplate
  if (z.type === 'brute') {
    ctx.fillStyle = '#7f8c8d';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + z.radius * 0.4, z.radius * 0.55, z.radius * 0.22, angle, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  // Exploder Dynamite Pack
  if (z.type === 'exploder') {
    ctx.fillStyle = '#e74c3c';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.0;
    const ex = s.x + Math.cos(angle + Math.PI) * z.radius * 0.1;
    const ey = s.y + Math.sin(angle + Math.PI) * z.radius * 0.1;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.fillRect(-z.radius * 0.32, -z.radius * 0.08, z.radius * 0.64, z.radius * 0.4);
    ctx.strokeRect(-z.radius * 0.32, -z.radius * 0.08, z.radius * 0.64, z.radius * 0.4);
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-z.radius * 0.75, z.radius * 0.12); ctx.lineTo(z.radius * 0.75, z.radius * 0.12); ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(s.x - rx * 0.32, s.y - ry * 0.38, rx * 0.32, ry * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();

  if (z.hairKind === 'hood') {
    ctx.fillStyle = z.skinDark;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, z.radius * 1.02, angle + Math.PI * 0.58, angle + Math.PI * 1.42);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (z.hairKind === 'tuft') {
    ctx.fillStyle = z.skinDark;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    const backAngle = angle + Math.PI;
    for (let i = -1; i <= 1; i++) {
      const a = backAngle + i * 0.4;
      const perp = a + Math.PI / 2;
      const baseX = s.x + Math.cos(a) * z.radius * 0.85, baseY = s.y + Math.sin(a) * z.radius * 0.85;
      const tipX = s.x + Math.cos(a) * z.radius * 1.25, tipY = s.y + Math.sin(a) * z.radius * 1.25;
      ctx.beginPath();
      ctx.moveTo(baseX + Math.cos(perp) * 3, baseY + Math.sin(perp) * 3);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseX - Math.cos(perp) * 3, baseY - Math.sin(perp) * 3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  if (z.type === 'exploder') {
    const pulse = z.fuseStart ? (0.5 + 0.5 * Math.sin(performance.now() * 0.03)) : (0.3 + 0.2 * Math.sin(performance.now() * 0.006));
    ctx.strokeStyle = `rgba(255,${z.fuseStart ? 60 : 160},60,${pulse})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = angle + i * 2.1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(a) * z.radius * 0.8, s.y + Math.sin(a) * z.radius * 0.8);
      ctx.stroke();
    }
  }

  const e1a = angle - 0.45, e2a = angle + 0.45;
  if (z.type === 'exploder') {
    ctx.fillStyle = '#ffb347';
    [e1a, e2a].forEach(a => {
      const ex = s.x + Math.cos(a) * z.radius * 0.42, ey = s.y + Math.sin(a) * z.radius * 0.42;
      ctx.beginPath(); ctx.ellipse(ex, ey, z.radius * 0.13, z.radius * 0.06, angle, 0, Math.PI * 2); ctx.fill();
    });
  } else {
    const upx = Math.cos(angle), upy = Math.sin(angle);
    const perpx = Math.cos(angle + Math.PI / 2), perpy = Math.sin(angle + Math.PI / 2);
    const eyeSep = z.radius * 0.3;
    const eyeFwd = z.radius * 0.22;
    [-1, 1].forEach(side => {
      const ex = s.x + upx * eyeFwd + perpx * eyeSep * side;
      const ey = s.y + upy * eyeFwd + perpy * eyeSep * side;
      ctx.fillStyle = '#f4f4ec';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(ex, ey, z.radius * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c1c1c';
      ctx.beginPath(); ctx.arc(ex + upx * z.radius * 0.045, ey + upy * z.radius * 0.045, z.radius * 0.075, 0, Math.PI * 2); ctx.fill();

      const browFwd = z.radius * 0.34;
      const halfLen = z.radius * 0.13;
      const innerX = ex - upx * (browFwd + z.radius * 0.03) - perpx * halfLen * side;
      const innerY = ey - upy * (browFwd + z.radius * 0.03) - perpy * halfLen * side;
      const outerX = ex - upx * browFwd + perpx * halfLen * side;
      const outerY = ey - upy * browFwd + perpy * halfLen * side;
      ctx.strokeStyle = z.skinDark; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
      ctx.lineCap = 'butt';
    });

    const mx = s.x + Math.cos(angle) * z.radius * 0.55, my = s.y + Math.sin(angle) * z.radius * 0.55;
    if (z.mouthKind === 'open') {
      ctx.fillStyle = '#1c1c1c';
      ctx.beginPath(); ctx.ellipse(mx, my, z.radius * 0.22, z.radius * 0.16, angle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e2d0';
      for (let i = -1; i <= 1; i += 2) { ctx.fillRect(mx + i * z.radius * 0.12 - 1.5, my - z.radius * 0.1, 3, z.radius * 0.12); }
    } else if (z.mouthKind === 'grimace') {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const zx = mx + Math.cos(angle + Math.PI / 2) * i * z.radius * 0.09;
        const zy = my + Math.sin(angle + Math.PI / 2) * i * z.radius * 0.09 + (i % 2 === 0 ? 2 : -2);
        if (i === -2) ctx.moveTo(zx, zy); else ctx.lineTo(zx, zy);
      }
      ctx.stroke();
    } else {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, z.radius * 0.22, angle - Math.PI * 0.35, angle + Math.PI * 0.35); ctx.stroke();
    }
  }

  const barW = z.radius * 2;
  ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW, 5);
  ctx.fillStyle = '#ff5c5c';
  ctx.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW * (z.hp / z.maxHp), 5);
}

export function drawSpiderZombie(
  ctx: CanvasRenderingContext2D, z: Zombie, s: Vec2, angle: number, flashing: boolean, OUTLINE: string
): void {
  const r = z.radius;
  const bodyCol = flashing ? '#ffffff' : z.skinColor;
  const bodyCol2 = flashing ? '#ffffff' : z.skinColor2;
  const legCol = flashing ? '#ffffff' : z.skinDark;
  const fx = Math.cos(angle), fy = Math.sin(angle);
  const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);

  // Draw 8 legs
  const legAngles = [-1.3, -0.9, -0.5, -0.1, 0.1, 0.5, 0.9, 1.3];
  legAngles.forEach((legOffset, idx) => {
    const side = idx < 4 ? -1 : 1;
    const a = angle + legOffset + (side * Math.PI / 4);
    const hipX = s.x + Math.cos(angle + legOffset) * r * 0.45;
    const hipY = s.y + Math.sin(angle + legOffset) * r * 0.45;
    const jointX = hipX + Math.cos(a) * r * 0.8;
    const jointY = hipY + Math.sin(a) * r * 0.8;
    const tipAngle = a + side * 0.6;
    const tipX = jointX + Math.cos(tipAngle) * r * 0.7;
    const tipY = jointY + Math.sin(tipAngle) * r * 0.7;

    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = r * 0.22 + 4;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(jointX, jointY); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = legCol; ctx.lineWidth = r * 0.22;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(jointX, jointY); ctx.lineTo(tipX, tipY); ctx.stroke();
    
    // Fuzzy leg hairs
    if (!flashing) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
      const hairAngle = a + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(jointX, jointY);
      ctx.lineTo(jointX + Math.cos(hairAngle) * 5, jointY + Math.sin(hairAngle) * 5);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  });

  // Abdomen (large oval behind)
  const abdX = s.x - fx * r * 0.45, abdY = s.y - fy * r * 0.45;
  ctx.fillStyle = radialFill(ctx, abdX, abdY, r * 1.0, bodyCol, '#000000');
  ctx.beginPath(); ctx.ellipse(abdX, abdY, r * 1.0, r * 0.82, angle, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  // Head (smaller round in front)
  const headX = s.x + fx * r * 0.45, headY = s.y + fy * r * 0.45;
  ctx.fillStyle = radialFill(ctx, headX, headY, r * 0.65, bodyCol, bodyCol2);
  ctx.beginPath(); ctx.ellipse(headX, headY, r * 0.65, r * 0.55, angle, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();

  // Spider Fangs (Chelicerae)
  ctx.fillStyle = '#f0ead6';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  [-1, 1].forEach(side => {
    const fangAngle = angle + side * 0.25;
    const fx1 = headX + Math.cos(fangAngle) * r * 0.5;
    const fy1 = headY + Math.sin(fangAngle) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(fx1, fy1);
    ctx.lineTo(fx1 + Math.cos(angle + side * 0.1) * 7, fy1 + Math.sin(angle + side * 0.1) * 7);
    ctx.lineTo(fx1 + Math.cos(angle - side * 0.1) * 3, fy1 + Math.sin(angle - side * 0.1) * 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });

  // Glowing spider eyes (multiple red dots on the head)
  ctx.fillStyle = '#ff1e1e';
  [-0.3, -0.1, 0.1, 0.3].forEach(off => {
    const ex1 = headX + fx * r * 0.32 + px * r * off * 0.7;
    const ey1 = headY + fy * r * 0.32 + py * r * off * 0.7;
    ctx.beginPath(); ctx.arc(ex1, ey1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    const ex2 = headX + fx * r * 0.15 + px * r * off * 0.8;
    const ey2 = headY + fy * r * 0.15 + py * r * off * 0.8;
    ctx.beginPath(); ctx.arc(ex2, ey2, r * 0.06, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawWitchZombie(
  ctx: CanvasRenderingContext2D, z: Zombie, s: Vec2, angle: number, flashing: boolean, OUTLINE: string
): void {
  const r = z.radius;
  const bodyCol = flashing ? '#ffffff' : z.skinColor;
  const bodyCol2 = flashing ? '#ffffff' : z.skinColor2;
  const fx = Math.cos(angle), fy = Math.sin(angle);
  const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);

  // Buffing Aura (pink magic circle below her)
  ctx.save();
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 160, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(192, 132, 252, 0.04)';
  ctx.fill();
  ctx.restore();

  // Hands holding magic orbs
  const armSpread = 0.8;
  const armReach = 0.85;
  drawZombieArmBlobs(ctx, s.x, s.y, r, angle, armSpread, armReach, bodyCol, bodyCol2, OUTLINE, flashing);

  // Magic particles near hands
  if (!flashing) {
    ctx.fillStyle = '#c084fc';
    [-1, 1].forEach(side => {
      const hAngle = angle + side * armSpread;
      const hx = s.x + Math.cos(hAngle) * r * armReach;
      const hy = s.y + Math.sin(hAngle) * r * armReach;
      ctx.beginPath(); ctx.arc(hx + Math.random() * 6 - 3, hy + Math.random() * 6 - 3, 2.5 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  // Magic Staff (crystal staff)
  const staffAngle = angle + 0.7;
  const handDist = r * 0.85;
  const hx = s.x + Math.cos(staffAngle) * handDist;
  const hy = s.y + Math.sin(staffAngle) * handDist;
  ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(hx - Math.cos(angle) * r * 0.5, hy - Math.sin(angle) * r * 0.5);
  ctx.lineTo(hx + Math.cos(angle) * r * 0.9, hy + Math.sin(angle) * r * 0.9);
  ctx.stroke();
  ctx.fillStyle = '#9b59b6'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx + Math.cos(angle) * r * 0.9 - px * 4, hy + Math.sin(angle) * r * 0.9 - py * 4);
  ctx.lineTo(hx + Math.cos(angle) * r * 0.9 + Math.cos(angle) * 12, hy + Math.sin(angle) * r * 0.9 + Math.sin(angle) * 12);
  ctx.lineTo(hx + Math.cos(angle) * r * 0.9 + px * 4, hy + Math.sin(angle) * r * 0.9 + py * 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Witch dress (flowing purple cape/skirt)
  ctx.fillStyle = '#4a235a';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(s.x, s.y + r * 0.45, r * 0.8, 0, Math.PI);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Body
  const rx = r * z.squishX, ry = r * z.squishY;
  ctx.fillStyle = radialFill(ctx, s.x, s.y, r, bodyCol, bodyCol2);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.stroke();

  // Eyes (creepy green glowing eyes!)
  ctx.fillStyle = '#2ecc71';
  [-1, 1].forEach(side => {
    const ex = s.x + fx * r * 0.22 + px * r * 0.3 * side;
    const ey = s.y + fy * r * 0.22 + py * r * 0.3 * side;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e1c0e';
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.06, 0, Math.PI * 2); ctx.fill();
  });

  // Witch Hat (Brim: wide ellipse, Cone: triangle offset backwards)
  ctx.fillStyle = '#1a052e';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  const brimW = r * 1.5, brimH = r * 0.95;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, brimW, brimH, angle, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  
  const coneBaseL = s.x - px * r * 0.4 - fx * r * 0.1;
  const coneBaseR = s.x + px * r * 0.4 - fx * r * 0.1;
  const coneTip = s.x - fx * r * 1.4;
  const coneBaseLy = s.y - py * r * 0.4 - fy * r * 0.1;
  const coneBaseRy = s.y + py * r * 0.4 - fy * r * 0.1;
  const coneTipy = s.y - fy * r * 1.4;
  ctx.beginPath();
  ctx.moveTo(coneBaseL, coneBaseLy);
  ctx.lineTo(coneBaseR, coneBaseRy);
  ctx.lineTo(coneTip, coneTipy);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Hat band (purple)
  ctx.fillStyle = '#8e44ad';
  ctx.beginPath();
  ctx.moveTo(coneBaseL, coneBaseLy);
  ctx.lineTo(coneBaseR, coneBaseRy);
  ctx.lineTo(s.x - fx * r * 0.35, s.y - fy * r * 0.35);
  ctx.closePath(); ctx.fill();
}
