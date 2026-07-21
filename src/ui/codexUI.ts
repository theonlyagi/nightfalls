import { ZombieKind } from '../types';
import { byId } from '../utils';
import { codex, loadCodex } from '../systems/codex';

// 7종의 좀비 도감 상세 정의
export interface SpecimenDef {
  id: ZombieKind;
  name: string;
  hp: string;
  speed: string;
  danger: string;
  lore: string;
  draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) => void;
}

export const SPECIMENS: SpecimenDef[] = [
  {
    id: 'normal',
    name: 'Normal Zombie',
    hp: 'Medium (80)',
    speed: 'Normal (100%)',
    danger: 'Low',
    lore: 'The most common manifestation of the pathogen. While individually slow and clumsy, they rely on swarm tactics to overwhelm survivors. Always maintain distance to prevent being surrounded.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.005) * 2;
      const armAnim = Math.sin(time * 0.007) * 0.15;
      drawDummyZombie(ctx, cx, cy + bounce, 18, '#4c8a52', '#3a6b40', '#274d2b', armAnim, false);
    }
  },
  {
    id: 'scout',
    name: 'Scout Zombie',
    hp: 'Low (44)',
    speed: 'Fast (170%)',
    danger: 'Medium',
    lore: 'Distinguished by their sickly yellow skin and smaller frame. They possess heightened awareness and move with alarming speed. Prioritize shooting scouts before they sprint into your position.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.008) * 3;
      const armAnim = Math.sin(time * 0.01) * 0.25;
      drawDummyZombie(ctx, cx, cy + bounce, 14, '#c9c24e', '#a8a13c', '#7a742a', armAnim, false);
    }
  },
  {
    id: 'brute',
    name: 'Brute Zombie',
    hp: 'High (192)',
    speed: 'Slow (65%)',
    danger: 'High',
    lore: 'A massive mutated specimen with thick blood-red skin and protruding bone spurs on its shoulders. It moves slowly but can endure extreme firepower and deliver crushing melee blows to fortifications.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.003) * 1.5;
      const armAnim = Math.sin(time * 0.004) * 0.08;
      ctx.save();
      ctx.translate(cx, cy + bounce);
      ctx.fillStyle = '#4d2020';
      ctx.strokeStyle = '#141f18';
      ctx.lineWidth = 2;
      [-0.7, 0.7].forEach(off => {
        ctx.beginPath();
        ctx.arc(Math.cos(off + Math.PI/2) * 22, Math.sin(off + Math.PI/2) * 22, 6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });
      ctx.restore();
      drawDummyZombie(ctx, cx, cy + bounce, 24, '#8a3d3d', '#6e2f2f', '#4d2020', armAnim, false);
    }
  },
  {
    id: 'spitter',
    name: 'Spitter Zombie',
    hp: 'Low (56)',
    speed: 'Slow (55%)',
    danger: 'Medium',
    lore: 'Carries a swollen, translucent acidic sac on its back. It spits high-velocity corrosive bile from long range. Keep moving to dodge its projectiles and protect your defensive walls.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.004) * 1.8;
      ctx.fillStyle = '#437040';
      ctx.strokeStyle = '#141f18';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy + bounce + 10, 10, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      drawDummyZombie(ctx, cx, cy + bounce, 15, '#5a9151', '#437040', '#2b4526', 0, true);
    }
  },
  {
    id: 'exploder',
    name: 'Exploder Zombie',
    hp: 'Medium (48)',
    speed: 'Fast (150%)',
    danger: 'High',
    lore: 'Swollen with highly unstable volatile gases. When triggered or killed, they combust in a massive explosion. Extremely dangerous to defensive lines — destroy them before they breach your walls.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.006) * 2.2;
      const pulse = 20 + Math.sin(time * 0.01) * 2;
      drawDummyZombie(ctx, cx, cy + bounce, pulse, '#c07a2e', '#9c5c1e', '#5c2e0d', 0, false, true);
    }
  },
  {
    id: 'wolf',
    name: 'Zombie Wolf',
    hp: 'Low (40)',
    speed: 'Very Fast (185%)',
    danger: 'High',
    lore: 'Plague-infected feral beast that retains its pack hunting instinct. Possesses relentless attack speed and can quickly slip past defenses. Keep your shotguns ready for close encounters.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.008) * 3;
      const legOffset = Math.sin(time * 0.015) * 8;
      
      ctx.save();
      ctx.translate(cx, cy + bounce);
      
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 15, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#3a444c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.quadraticCurveTo(-28, -8 + bounce, -32, 2);
      ctx.stroke();

      ctx.strokeStyle = '#3a444c';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-10 + legOffset, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-6 - legOffset, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(10 - legOffset, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 5); ctx.lineTo(14 + legOffset, 15); ctx.stroke();

      ctx.fillStyle = '#7a8a95';
      ctx.strokeStyle = '#141f18';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#5c6b75';
      ctx.beginPath();
      ctx.arc(14, -8, 8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#3a444c';
      ctx.fillRect(18, -10, 8, 4);
      ctx.strokeRect(18, -10, 8, 4);

      ctx.fillStyle = '#7a8a95';
      ctx.beginPath();
      ctx.moveTo(10, -14); ctx.lineTo(14, -20); ctx.lineTo(16, -14);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(16, -10, 2, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }
  },
  {
    id: 'boss',
    name: 'Megazombie Boss',
    hp: 'Massive (Boss)',
    speed: 'Normal (100%)',
    danger: 'Extreme',
    lore: 'A colossal, highly unstable mutated titan representing the apex of the infection. It commands other zombies and strikes with planet-shaking force. Aim for its glowing red eyes and keep structures repaired.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.003) * 1;
      const armAnim = Math.sin(time * 0.004) * 0.05;
      
      ctx.save();
      ctx.translate(cx, cy + bounce);
      
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + time * 0.001;
        ctx.fillStyle = '#7c3aed';
        ctx.strokeStyle = '#141f18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 35, Math.sin(a) * 35);
        ctx.lineTo(Math.cos(a + 0.1) * 48, Math.sin(a + 0.1) * 48);
        ctx.lineTo(Math.cos(a - 0.1) * 48, Math.sin(a - 0.1) * 48);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();

      drawDummyZombie(ctx, cx, cy + bounce, 36, '#4b2a63', '#3a1f4d', '#241333', armAnim, false, false, true);
    }
  },
  {
    id: 'spider',
    name: 'Zombie Spider',
    hp: 'Medium (64)',
    speed: 'Fast (135%)',
    danger: 'High',
    lore: 'A mutated arachnid specimen carrying the pathogen. It can easily crawl through/over defensive barricades and structures, making wall blocking less effective. Its long-range web attack slows you down significantly.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.005) * 1.5;
      ctx.save();
      ctx.translate(cx, cy + bounce);
      
      const r = 16;
      const OUTLINE = '#141f18';
      const bodyCol = '#2c3e50';
      const bodyCol2 = '#1a252f';
      const legCol = '#0e141a';

      // 8 legs
      const legAngles = [-1.3, -0.9, -0.5, -0.1, 0.1, 0.5, 0.9, 1.3];
      legAngles.forEach((legOffset, idx) => {
        const side = idx < 4 ? -1 : 1;
        const legSweep = Math.sin(time * 0.008 + idx * 0.5) * 0.18;
        const a = legOffset + (side * Math.PI / 4) + legSweep;
        const hipX = Math.cos(legOffset) * r * 0.45;
        const hipY = Math.sin(legOffset) * r * 0.45;
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
      });

      // Abdomen
      ctx.fillStyle = bodyCol;
      ctx.beginPath(); ctx.ellipse(-r * 0.4, 0, r * 1.0, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();

      // Head
      ctx.fillStyle = bodyCol2;
      ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.65, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.0; ctx.stroke();

      // Eyes
      ctx.fillStyle = '#ff1e1e';
      [-0.2, 0, 0.2].forEach(off => {
        ctx.beginPath(); ctx.arc(r * 0.65, r * off * 0.35, r * 0.08, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }
  },
  {
    id: 'witch',
    name: 'Zombie Witch',
    hp: 'High (112)',
    speed: 'Slow (80%)',
    danger: 'Extreme',
    lore: 'A dangerous sorceress of the plague. She throws high-damage magic orbs from a distance and summons lesser zombies to screen her. She casts a permanent speed-boosting aura for all nearby zombies.',
    draw: (ctx, cx, cy, time) => {
      const bounce = Math.sin(time * 0.004) * 2;
      ctx.save();
      ctx.translate(cx, cy + bounce);

      const r = 18;
      const OUTLINE = '#141f18';
      const bodyCol = '#8e44ad';
      const bodyCol2 = '#7d3c98';

      // Cape/dress
      ctx.fillStyle = '#4a235a';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.8, 0, Math.PI);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Arms
      const armAnim = Math.sin(time * 0.007) * 0.15;
      drawDummyZombie(ctx, 0, 0, r, bodyCol, bodyCol2, '#4a235a', armAnim, true);

      // Hat
      ctx.fillStyle = '#1a052e';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      // brim
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.95, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // cone
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.1);
      ctx.lineTo(r * 0.4, -r * 0.1);
      ctx.lineTo(-r * 0.6, -r * 1.3);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.restore();
    }
  }
];

function drawDummyZombie(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  bodyCol: string, bodyCol2: string, darkCol: string, armAngle: number,
  ranged: boolean, exploderGlow: boolean = false, isBoss: boolean = false
): void {
  ctx.save();
  
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.65, r * 0.85, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  const OUTLINE = '#141f18';
  
  const spread = ranged ? 0.62 : 0.48;
  const reach = ranged ? 0.8 : 0.88;
  [-1, 1].forEach(side => {
    const angle = -Math.PI / 2 + side * spread + armAngle;
    const bx = cx + Math.cos(angle) * r * reach;
    const by = cy + Math.sin(angle) * r * reach;
    const blobR = r * 0.52;

    ctx.strokeStyle = OUTLINE; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.6 + 5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.45)'; ctx.lineWidth = r * 0.6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();

    ctx.fillStyle = radialFillDummy(ctx, bx, by, blobR, bodyCol, bodyCol2);
    ctx.beginPath(); ctx.arc(bx, by, blobR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
  });

  ctx.fillStyle = radialFillDummy(ctx, cx, cy, r, bodyCol, bodyCol2);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.stroke();

  const eyeSep = r * 0.3;
  const eyeFwd = -r * 0.22;
  [-1, 1].forEach(side => {
    const ex = cx + eyeSep * side;
    const ey = cy + eyeFwd;
    ctx.fillStyle = isBoss ? '#ff3b3b' : '#f4f4ec';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.075, 0, Math.PI * 2); ctx.fill();
  });

  const mx = cx;
  const my = cy + r * 0.3;
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath(); ctx.ellipse(mx, my, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e2d0';
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillRect(mx + i * r * 0.12 - 1.5, my - r * 0.08, 3, r * 0.1);
  }

  if (exploderGlow) {
    const pulse = 0.4 + 0.3 * Math.sin(performance.now() * 0.008);
    ctx.fillStyle = `rgba(255, 120, 60, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r - 2, r - 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function radialFillDummy(ctx: CanvasRenderingContext2D, sx: number, sy: number, radius: number, cLight: string, cDark: string): CanvasGradient {
  const g = ctx.createRadialGradient(sx - radius * 0.3, sy - radius * 0.3, radius * 0.1, sx, sy, radius);
  g.addColorStop(0, cLight);
  g.addColorStop(1, cDark);
  return g;
}

let activeSpecimenId: ZombieKind | null = null;
let animationFrameId: number | null = null;

export function openCodex(): void {
  loadCodex();
  const modal = byId('codexModal');
  if (modal) {
    modal.classList.remove('hidden');
    renderCodexList();
    
    const firstEncountered = SPECIMENS.find(s => codex.encountered[s.id]);
    if (firstEncountered) {
      selectSpecimen(firstEncountered.id);
    } else {
      selectSpecimen(null);
    }

    startAnimationLoop();
  }
}

export function closeCodex(): void {
  const modal = byId('codexModal');
  if (modal) {
    modal.classList.add('hidden');
    stopAnimationLoop();
  }
}

function startAnimationLoop(): void {
  stopAnimationLoop();
  const canvas = byId<HTMLCanvasElement>('codexPreviewCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  function loop() {
    if (activeSpecimenId) {
      const specimen = SPECIMENS.find(s => s.id === activeSpecimenId);
      const isEncountered = codex.encountered[activeSpecimenId];
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      
      if (specimen && isEncountered) {
        specimen.draw(ctx!, canvas!.width / 2, canvas!.height / 2 + 5, performance.now());
      } else {
        ctx!.save();
        ctx!.fillStyle = '#6d9080';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.font = '700 32px Ubuntu';
        ctx!.fillText('LOCKED', canvas!.width / 2, canvas!.height / 2);
        ctx!.restore();
      }
    }
    animationFrameId = requestAnimationFrame(loop);
  }
  animationFrameId = requestAnimationFrame(loop);
}

function stopAnimationLoop(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

export function selectSpecimen(id: ZombieKind | null): void {
  activeSpecimenId = id;
  const detailEmpty = byId('codexDetailEmpty');
  const detailContent = byId('codexDetailContent');
  
  if (!id) {
    if (detailEmpty) detailEmpty.classList.remove('hidden');
    if (detailContent) detailContent.classList.add('hidden');
    return;
  }

  if (detailEmpty) detailEmpty.classList.add('hidden');
  if (detailContent) detailContent.classList.remove('hidden');

  const specimen = SPECIMENS.find(s => s.id === id);
  const isEncountered = codex.encountered[id];

  const nameEl = byId('codexMonsterName');
  const historyEl = byId('codexHistory');
  const statsEl = byId('codexStats');
  const loreEl = byId('codexLore');

  if (!specimen || !nameEl || !historyEl || !statsEl || !loreEl) return;

  if (isEncountered) {
    nameEl.textContent = specimen.name;
    
    const firstKillDate = codex.firstKilled[id];
    historyEl.innerHTML = `First Encountered: <span class="codex-highlight">Yes</span><br>First Defeated: <span class="codex-highlight">${firstKillDate || 'Not defeated yet'}</span>`;
    
    const dangerClass = specimen.danger.toLowerCase();
    statsEl.innerHTML = `
      <div class="codex-stat-row"><span>HEALTH</span><b>${specimen.hp}</b></div>
      <div class="codex-stat-row"><span>MOVEMENT SPEED</span><b>${specimen.speed}</b></div>
      <div class="codex-stat-row"><span>DANGER CLASS</span><b class="danger-tag ${dangerClass}">${specimen.danger}</b></div>
    `;

    loreEl.textContent = specimen.lore;
  } else {
    nameEl.textContent = '??? Locked Specimen';
    historyEl.innerHTML = `First Encountered: <span class="codex-locked">No</span>`;
    statsEl.innerHTML = `
      <div class="codex-stat-row"><span>HEALTH</span><b class="codex-locked">Unknown</b></div>
      <div class="codex-stat-row"><span>MOVEMENT SPEED</span><b class="codex-locked">Unknown</b></div>
      <div class="codex-stat-row"><span>DANGER CLASS</span><b class="codex-locked">Unknown</b></div>
    `;
    loreEl.textContent = 'Tactical data locked. Encounter this mutation during survival waves to unlock bestiary records.';
  }
}

export function renderCodexList(): void {
  const listEl = byId('codexList');
  if (!listEl) return;
  listEl.innerHTML = '';

  SPECIMENS.forEach(specimen => {
    const isEncountered = codex.encountered[specimen.id];
    
    const row = document.createElement('div');
    row.className = 'codex-row' + (activeSpecimenId === specimen.id ? ' active' : '');
    
    const thumb = document.createElement('canvas');
    thumb.width = 30;
    thumb.height = 30;
    thumb.className = 'codex-thumb';
    const tctx = thumb.getContext('2d');
    if (tctx) {
      if (isEncountered) {
        specimen.draw(tctx, 15, 17, 0);
      } else {
        tctx.fillStyle = '#6d9080';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.font = '700 14px Ubuntu';
        tctx.fillText('?', 15, 15);
      }
    }
    
    row.appendChild(thumb);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = isEncountered ? specimen.name : '??? Unknown';
    row.appendChild(nameSpan);

    row.onclick = () => {
      const activeRows = listEl.querySelectorAll('.codex-row.active');
      activeRows.forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      
      selectSpecimen(specimen.id);
    };

    listEl.appendChild(row);
  });
}

export function initCodexUI(): void {
  const codexBtn = byId('codexBtn');
  const closeBtn = byId('codexCloseBtn');
  
  if (codexBtn) {
    codexBtn.onclick = (e) => {
      e.stopPropagation();
      openCodex();
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      closeCodex();
    };
  }

  const modal = byId('codexModal');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeCodex();
      }
    };
  }
}
