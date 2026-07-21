import { WeaponKind, Bullet, TextParticle, Burst, PowerUpEntity } from '../types';
import { SKIN_TINTS, POWERUP_DEFS, POWERUP_LIFETIME_MS } from '../constants';
import { player, bullets, particles, bursts, RemotePlayer } from '../state';
import { worldToScreen, radialFill, drawShadow } from './drawWorld';

export function drawArms(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, radius: number,
  angle: number, spread: number, reach: number, armColor: string,
  outlineColor: string, armRadius: number, fingers?: boolean
): void {
  const a1 = angle - spread, a2 = angle + spread;
  const d = radius * reach;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  [a1, a2].forEach(a => {
    const ax = sx + Math.cos(a) * d, ay = sy + Math.sin(a) * d;
    ctx.fillStyle = armColor;
    ctx.beginPath(); ctx.arc(ax, ay, radius * armRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (fingers) {
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        const fa = a + i * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + Math.cos(fa) * radius * armRadius * 1.5, ay + Math.sin(fa) * radius * armRadius * 1.5);
        ctx.stroke();
      }
    }
  });
}

export function drawWeapon(ctx: CanvasRenderingContext2D, weapon: WeaponKind, OUTLINE: string, insta: boolean, sinceShot: number): void {
  const r = player.radius;
  const flashColor = insta ? 'rgba(255,140,60,0.95)' : 'rgba(255,224,102,0.9)';

  if (weapon === 'dualguns') {
    const drawMiniPistol = (yOff: number) => {
      ctx.fillStyle = '#20242a';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(r - 6, yOff - 2);
      ctx.lineTo(r - 13, yOff - 5);
      ctx.lineTo(r - 13, yOff + 5);
      ctx.lineTo(r - 6, yOff + 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a4148';
      ctx.fillRect(r - 3, yOff - 3.5, 24, 7);
      ctx.strokeRect(r - 3, yOff - 3.5, 24, 7);
      ctx.fillStyle = '#8a94a0';
      ctx.fillRect(r + 2, yOff - 3.5, 14, 2.2);
      ctx.fillStyle = '#20242a';
      ctx.fillRect(r + 18, yOff - 5, 7, 10);
      ctx.strokeRect(r + 18, yOff - 5, 7, 10);
      if (sinceShot < 70) {
        ctx.fillStyle = flashColor;
        ctx.beginPath(); ctx.arc(r + 27, yOff, insta ? 7 : 5, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawMiniPistol(-9);
    drawMiniPistol(9);
  } else if (weapon === 'machinegun') {
    ctx.fillStyle = '#20242a';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r - 8, -5); ctx.lineTo(r - 22, -11); ctx.lineTo(r - 22, 11); ctx.lineTo(r - 8, 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2c3234';
    ctx.fillRect(r - 4, -7, 44, 14);
    ctx.strokeRect(r - 4, -7, 44, 14);
    ctx.fillStyle = '#1c2022';
    ctx.fillRect(r + 2, -10, 26, 3);
    ctx.fillStyle = '#3a4024';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(r + 6, 7); ctx.lineTo(r + 2, 24); ctx.lineTo(r + 14, 24); ctx.lineTo(r + 14, 7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#20242a';
    ctx.fillRect(r + 32, -9, 12, 18);
    ctx.strokeRect(r + 32, -9, 12, 18);
    if (sinceShot < 70) {
      ctx.fillStyle = flashColor;
      ctx.beginPath(); ctx.arc(r + 46, 0, insta ? 12 : 9, 0, Math.PI * 2); ctx.fill();
    }
  } else if (weapon === 'shotgun') {
    ctx.fillStyle = '#6b4423';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r - 6, -6); ctx.lineTo(r - 20, -9); ctx.lineTo(r - 20, 9); ctx.lineTo(r - 6, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3f42';
    ctx.fillRect(r - 2, -7, 26, 14);
    ctx.strokeRect(r - 2, -7, 26, 14);
    ctx.fillStyle = '#7a5230';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
    ctx.fillRect(r + 2, 6, 14, 7);
    ctx.strokeRect(r + 2, 6, 14, 7);
    ctx.fillStyle = '#20242a';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r + 24, -7); ctx.lineTo(r + 34, -9); ctx.lineTo(r + 34, 9); ctx.lineTo(r + 24, 7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (sinceShot < 70) {
      ctx.fillStyle = flashColor;
      ctx.beginPath(); ctx.arc(r + 36, 0, insta ? 11 : 9, 0, Math.PI * 2); ctx.fill();
    }
  } else if (weapon === 'grenadelauncher') {
    ctx.fillStyle = '#2a2f22';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r - 6, -5); ctx.lineTo(r - 16, -9); ctx.lineTo(r - 16, 9); ctx.lineTo(r - 6, 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a5c3a';
    ctx.fillRect(r - 2, -10, 30, 20);
    ctx.strokeRect(r - 2, -10, 30, 20);
    ctx.fillStyle = '#ff9f43';
    ctx.fillRect(r + 16, -10, 4, 20);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r + 2, -10); ctx.lineTo(r + 2, -16); ctx.lineTo(r + 14, -16); ctx.lineTo(r + 14, -10);
    ctx.stroke();
    ctx.fillStyle = '#1c2018';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r + 28, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0a0c08';
    ctx.beginPath(); ctx.arc(r + 28, 0, 5, 0, Math.PI * 2); ctx.fill();
    if (sinceShot < 120) {
      ctx.fillStyle = insta ? 'rgba(255,140,60,0.95)' : 'rgba(255,159,67,0.9)';
      ctx.beginPath(); ctx.arc(r + 28, 0, insta ? 13 : 10, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#20242a';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r - 8, -3); ctx.lineTo(r - 18, -8); ctx.lineTo(r - 18, 8); ctx.lineTo(r - 8, 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#33393b';
    ctx.fillRect(r - 4, -5, 34, 10);
    ctx.strokeRect(r - 4, -5, 34, 10);
    ctx.fillStyle = '#14181a';
    ctx.fillRect(r + 6, -9, 6, 4);
    ctx.strokeRect(r + 6, -9, 6, 4);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(r + 22, -7, 10, 14);
    ctx.strokeRect(r + 22, -7, 10, 14);
    if (sinceShot < 70) {
      ctx.fillStyle = flashColor;
      ctx.beginPath(); ctx.arc(r + 34, 0, insta ? 10 : 7, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D): void {
  const s = worldToScreen(player.x, player.y);
  const angle = player.angle;
  const tint = player.skinTint ? SKIN_TINTS[player.skinTint] : ['#ffd9ad', '#e0ac7a'];
  const skin = player.alive ? radialFill(ctx, s.x, s.y, player.radius, tint[0], tint[1]) : '#555';
  const armColor = player.alive ? tint[1] : '#444';
  const OUTLINE = '#4a3220';
  const insta = performance.now() < player.instaKillUntil;

  if (player.alive) {
    const glowR = player.radius * (insta ? 3.2 : 2.2);
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
    glow.addColorStop(0, insta ? 'rgba(255,215,106,0.35)' : 'rgba(255,220,150,0.22)');
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2); ctx.fill();
  }

  if (player.alive && (player.mutation === 'vampire' || player.mutation === 'pyromaniac')) {
    const auraColor = player.mutation === 'vampire' ? 'rgba(138,43,180,0.4)' : 'rgba(255,60,40,0.4)';
    const auraR = player.radius * 2.6;
    const aura = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, auraR);
    aura.addColorStop(0, auraColor);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(s.x, s.y, auraR, 0, Math.PI * 2); ctx.fill();
  }

  drawShadow(ctx, s.x, s.y, player.radius);

  const bx = s.x - Math.cos(angle) * player.radius * 0.7, by = s.y - Math.sin(angle) * player.radius * 0.7;
  ctx.fillStyle = '#5a4632';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(bx, by, player.radius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle);
  drawWeapon(ctx, player.weapon, OUTLINE, insta, performance.now() - player.lastShot);
  ctx.restore();

  drawArms(ctx, s.x, s.y, player.radius, angle, 0.4, 0.75, armColor, OUTLINE, 0.34, true);

  ctx.fillStyle = tint[1];
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
  [angle - Math.PI / 2, angle + Math.PI / 2].forEach(a => {
    const ex = s.x + Math.cos(a) * player.radius * 0.9, ey = s.y + Math.sin(a) * player.radius * 0.9;
    ctx.beginPath(); ctx.arc(ex, ey, player.radius * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });

  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(s.x, s.y, player.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(s.x - player.radius * 0.32, s.y - player.radius * 0.38, player.radius * 0.32, player.radius * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#4a3220';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, player.radius * 1.0, angle + Math.PI * 0.62, angle + Math.PI * 1.38);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  {
    const upx = Math.cos(angle), upy = Math.sin(angle);
    const perpx = Math.cos(angle + Math.PI / 2), perpy = Math.sin(angle + Math.PI / 2);
    const eyeSep = player.radius * 0.3;
    const eyeFwd = player.radius * 0.24;
    [-1, 1].forEach(side => {
      const ex = s.x + upx * eyeFwd + perpx * eyeSep * side;
      const ey = s.y + upy * eyeFwd + perpy * eyeSep * side;
      ctx.fillStyle = '#2a2118';
      ctx.beginPath(); ctx.arc(ex, ey, player.radius * 0.075, 0, Math.PI * 2); ctx.fill();
      const browFwd = player.radius * 0.34;
      const halfLen = player.radius * 0.11;
      const innerX = ex - upx * (browFwd + player.radius * 0.025) - perpx * halfLen * side;
      const innerY = ey - upy * (browFwd + player.radius * 0.025) - perpy * halfLen * side;
      const outerX = ex - upx * browFwd + perpx * halfLen * side;
      const outerY = ey - upy * browFwd + perpy * halfLen * side;
      ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
      ctx.lineCap = 'butt';
    });
  }

  const mx = s.x + Math.cos(angle) * player.radius * 0.5, my = s.y + Math.sin(angle) * player.radius * 0.5;
  ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mx, my, player.radius * 0.2, angle - Math.PI * 0.3, angle + Math.PI * 0.3); ctx.stroke();

  if (player.mutation === 'vampire') {
    const upx = Math.cos(angle), upy = Math.sin(angle);
    const perpx = Math.cos(angle + Math.PI / 2), perpy = Math.sin(angle + Math.PI / 2);
    ctx.fillStyle = '#8a3ab0';
    ctx.strokeStyle = '#2a1038'; ctx.lineWidth = 1;
    [-1, 1].forEach(side => {
      const bx = mx + perpx * player.radius * 0.1 * side, by = my + perpy * player.radius * 0.1 * side;
      const tipx = bx + upx * player.radius * 0.22, tipy = by + upy * player.radius * 0.22;
      ctx.beginPath();
      ctx.moveTo(bx - perpx * player.radius * 0.05 * side, by - perpy * player.radius * 0.05 * side);
      ctx.lineTo(tipx, tipy);
      ctx.lineTo(bx + perpx * player.radius * 0.05 * side, by + perpy * player.radius * 0.05 * side);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }
}

/** Simplified rendering for other players in a multiplayer match. Not the
 *  full detailed arms/weapon art drawPlayer() has (that's hardwired to the
 *  local `player` singleton throughout, not parameterized) — this is a
 *  correct, positionally-synced stand-in: body, facing wedge, name, HP bar. */
export function drawRemotePlayer(ctx: CanvasRenderingContext2D, rp: RemotePlayer): void {
  const s = worldToScreen(rp.x, rp.y);
  const radius = 22;
  const OUTLINE = '#4a3220';

  drawShadow(ctx, s.x, s.y, radius);

  ctx.fillStyle = rp.alive ? radialFill(ctx, s.x, s.y, radius, '#ffd9ad', '#e0ac7a') : '#555';
  ctx.beginPath(); ctx.arc(s.x, s.y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  if (rp.alive) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const tipX = s.x + Math.cos(rp.angle) * radius * 1.3, tipY = s.y + Math.sin(rp.angle) * radius * 1.3;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(rp.angle + 1.3) * radius * 0.6, s.y + Math.sin(rp.angle + 1.3) * radius * 0.6);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(s.x + Math.cos(rp.angle - 1.3) * radius * 0.6, s.y + Math.sin(rp.angle - 1.3) * radius * 0.6);
    ctx.closePath(); ctx.fill();
  }

  ctx.font = "11px 'Share Tech Mono', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf3ec';
  ctx.fillText(rp.name, s.x, s.y - radius - 18);

  const barW = radius * 2;
  ctx.fillStyle = '#00000088'; ctx.fillRect(s.x - barW / 2, s.y - radius - 12, barW, 5);
  ctx.fillStyle = '#ff5c5c'; ctx.fillRect(s.x - barW / 2, s.y - radius - 12, barW * Math.max(0, rp.hp / rp.maxHp), 5);
}

export function drawBullets(ctx: CanvasRenderingContext2D): void {
  for (const b of bullets) {
    const s = worldToScreen(b.x, b.y);
    if (b.explosive) {
      ctx.fillStyle = '#4a5c3a';
      ctx.strokeStyle = '#1c2018'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, b.radius * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath(); ctx.arc(s.x, s.y, b.radius * 0.6, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const col = b.owner === 'turret' ? '154,209,255' : (b.owner === 'zombie' ? '139,227,107' : '255,224,102');
    ctx.strokeStyle = `rgba(${col},0.5)`;
    ctx.lineWidth = b.radius;
    ctx.beginPath();
    ctx.moveTo(s.x - b.vx * 1.6, s.y - b.vy * 1.6);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.fillStyle = `rgb(${col})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, b.radius, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  ctx.font = "12px 'Share Tech Mono', monospace";
  ctx.textAlign = 'center';
  for (const p of particles) {
    const s = worldToScreen(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, s.x, s.y);
  }
  for (const p of bursts) {
    const s = worldToScreen(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    if (p.shape === 'casing') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, p.radius, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawPowerup(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, p: PowerUpEntity): void {
  const s = worldToScreen(p.x, p.y);
  if (s.x < -40 || s.x > canvas.width + 40 || s.y < -40 || s.y > canvas.height + 40) return;
  const def = POWERUP_DEFS[p.kind];
  const t = performance.now();
  const pulse = 0.7 + 0.3 * Math.sin(t * 0.006);
  const age = t - p.spawnTime;
  const fadeStart = POWERUP_LIFETIME_MS - 3000;
  const fade = age > fadeStart ? Math.max(0.15, 0.5 + 0.5 * Math.sin(age * 0.02)) : 1;
  ctx.save();
  ctx.globalAlpha = 0.3 * pulse * fade;
  ctx.fillStyle = def.color;
  ctx.beginPath(); ctx.arc(s.x, s.y, p.radius * 2.6 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = fade;
  ctx.translate(s.x, s.y);
  ctx.rotate(t * 0.0012);
  ctx.fillStyle = def.color;
  ctx.strokeStyle = '#14201a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    const a2 = a + Math.PI / 4;
    ctx.lineTo(Math.cos(a) * p.radius, Math.sin(a) * p.radius);
    ctx.lineTo(Math.cos(a2) * p.radius * 0.4, Math.sin(a2) * p.radius * 0.4);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#14201a';
  ctx.font = "bold 12px 'Orbitron', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(def.symbol, s.x, s.y + 4);
  ctx.globalAlpha = 1;
}
