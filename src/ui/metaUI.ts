import { MetaPerm } from '../types';
import {
  meta, selectedMode, setSelectedMode, selectedClass, setSelectedClass,
  playerName, lobby
} from '../state';
import { PERM_DEFS, START_BONUS_DEFS, META_SKIN_DEFS, MODE_DEFS, CLASS_DEFS } from '../constants';
import { byId, escapeHtml } from '../utils';
import { saveMeta, loadLeaderboard, loadMeta } from '../systems/storage';
import { net, connect, disconnect, sendReady, getMyId, NetLobbyMessage } from '../net/socket';

export function costFor(key: keyof MetaPerm): number {
  const def = PERM_DEFS[key];
  const lvl = meta.perm[key];
  return Math.round(def.costBase * (lvl + 1));
}

export function renderMetaPanel(): void {
  const ptsVal = byId('metaPointsVal'); if (ptsVal) ptsVal.textContent = String(meta.metaPoints);
  const waveVal = byId('bestWaveVal'); if (waveVal) waveVal.textContent = String(meta.bestWave);
  const killsVal = byId('lifetimeKillsVal'); if (killsVal) killsVal.textContent = String(meta.lifetimeKills);
  const gamesVal = byId('gamesPlayedVal'); if (gamesVal) gamesVal.textContent = String(meta.gamesPlayed);

  const wrap = byId('metaUpgrades');
  if (!wrap) return;
  wrap.innerHTML = '';
  (Object.keys(PERM_DEFS) as (keyof MetaPerm)[]).forEach(key => {
    const def = PERM_DEFS[key];
    const lvl = meta.perm[key];
    const cost = costFor(key);
    const affordable = meta.metaPoints >= cost;
    const btn = document.createElement('div');
    btn.className = 'meta-btn' + (affordable ? '' : ' disabled');
    btn.innerHTML = `<b>${def.label}</b><span class="lvl">Lv ${lvl}</span><div>${def.desc}</div><div class="cost">${cost} pts</div>`;
    btn.onclick = async () => {
      if (meta.metaPoints < cost) return;
      meta.metaPoints -= cost;
      meta.perm[key]++;
      await saveMeta();
      renderMetaPanel();
    };
    wrap.appendChild(btn);
  });
}

export function renderStartBonuses(): void {
  const wrap = byId('startBonuses');
  if (!wrap) return;
  wrap.innerHTML = '';
  START_BONUS_DEFS.forEach(b => {
    const owned = !!meta.startBonuses[b.key];
    const affordable = meta.metaPoints >= b.cost;
    const btn = document.createElement('div');
    btn.className = 'meta-btn' + (owned ? ' equipped' : (affordable ? '' : ' disabled'));
    btn.innerHTML = `<b>${b.label}</b><div>${b.desc}</div><div class="cost">${owned ? 'OWNED' : b.cost + ' pts'}</div>`;
    btn.onclick = async () => {
      if (owned || meta.metaPoints < b.cost) return;
      meta.metaPoints -= b.cost;
      meta.startBonuses[b.key] = true;
      await saveMeta();
      renderStartBonuses();
      renderMetaPanel();
    };
    wrap.appendChild(btn);
  });
}

export function renderMetaSkins(): void {
  const wrap = byId('metaSkins');
  if (!wrap) return;
  wrap.innerHTML = '';
  const equipDefault = document.createElement('div');
  equipDefault.className = 'meta-btn' + (meta.equippedSkin === null ? ' equipped' : '');
  equipDefault.innerHTML = `<b>Default</b><div>Standard survivor outfit</div><div class="cost">${meta.equippedSkin === null ? 'EQUIPPED' : 'EQUIP'}</div>`;
  equipDefault.onclick = async () => {
    meta.equippedSkin = null;
    await saveMeta();
    renderMetaSkins();
  };
  wrap.appendChild(equipDefault);

  META_SKIN_DEFS.forEach(s => {
    const owned = meta.unlockedSkins.includes(s.key);
    const equipped = meta.equippedSkin === s.key;
    const affordable = meta.metaPoints >= s.cost;
    const btn = document.createElement('div');
    btn.className = 'meta-btn' + (equipped ? ' equipped' : (!owned && !affordable ? ' disabled' : ''));
    btn.innerHTML = `<b>${s.label}</b><div>Custom survivor skin</div><div class="cost">${owned ? (equipped ? 'EQUIPPED' : 'EQUIP') : s.cost + ' pts'}</div>`;
    btn.onclick = async () => {
      if (!owned) {
        if (meta.metaPoints < s.cost) return;
        meta.metaPoints -= s.cost;
        meta.unlockedSkins.push(s.key);
      }
      meta.equippedSkin = s.key;
      await saveMeta();
      renderMetaSkins();
      renderMetaPanel();
    };
    wrap.appendChild(btn);
  });
}

export async function renderLeaderboard(): Promise<void> {
  const list = await loadLeaderboard();
  const el = byId('leaderboardList');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="lb-empty">No runs yet — be the first survivor.</div>'; return; }
  el.innerHTML = list.map((e, i) => `
    <div class="florr-lb-item">
      <span class="florr-lb-rank">#${i + 1}</span>
      <span class="florr-lb-name">${escapeHtml(e.name || 'Survivor')}</span>
      <span class="florr-lb-stat">W${e.wave} &bull; ${e.kills} kills</span>
    </div>
  `).join('');
}

export function renderModeSelect(): void {
  const wrap = byId('modeSelect');
  if (!wrap) return;
  wrap.innerHTML = '';
  (Object.keys(MODE_DEFS) as ('solo' | 'team')[]).forEach(key => {
    const def = MODE_DEFS[key];
    const icon = key === 'solo' ? 'person' : 'groups';
    const card = document.createElement('div');
    card.className = 'florr-mode-card' + (selectedMode === key ? ' active' : '');
    card.innerHTML = `<span class="material-symbols-outlined mode-icon">${icon}</span><b>${def.label}</b><span>${def.desc}</span>`;
    card.onclick = () => { setSelectedMode(key); renderModeSelect(); updateStartBtnLabel(); };
    wrap.appendChild(card);
  });
}

export function updateStartBtnLabel(): void {
  const btn = byId('startBtn');
  if (btn) {
    const labelText = selectedMode === 'team' ? 'QUEUE UP' : 'ENTER THE ZONE';
    btn.innerHTML = `${labelText} <span class="material-symbols-outlined btn-icon">rocket_launch</span>`;
  }
}

export function openMetaModal(tab: 'upgrades' | 'bonuses' | 'skins'): void {
  const modal = byId('metaModal');
  const title = byId('metaModalTitle');
  const upgradesSec = byId('metaModalUpgradesSection');
  const bonusesSec = byId('metaModalBonusesSection');
  const skinsSec = byId('metaModalSkinsSection');
  if (!modal) return;

  if (upgradesSec) upgradesSec.classList.toggle('hidden', tab !== 'upgrades');
  if (bonusesSec) bonusesSec.classList.toggle('hidden', tab !== 'bonuses');
  if (skinsSec) skinsSec.classList.toggle('hidden', tab !== 'skins');

  if (title) {
    if (tab === 'upgrades') title.textContent = 'PERMANENT UPGRADES';
    else if (tab === 'bonuses') title.textContent = 'STARTING BONUSES';
    else if (tab === 'skins') title.textContent = 'SURVIVOR SKINS';
  }

  modal.classList.remove('hidden');
}

export function closeMetaModal(): void {
  const modal = byId('metaModal');
  if (modal) modal.classList.add('hidden');
}

export function setupMetaModalTabs(): void {
  const uBtn = byId('tabUpgradesBtn');
  const bBtn = byId('tabBonusesBtn');
  const sBtn = byId('tabSkinsBtn');
  const closeBtn = byId('metaModalCloseBtn');

  if (uBtn) uBtn.onclick = () => openMetaModal('upgrades');
  if (bBtn) bBtn.onclick = () => openMetaModal('bonuses');
  if (sBtn) sBtn.onclick = () => openMetaModal('skins');
  if (closeBtn) closeBtn.onclick = () => closeMetaModal();
}

export function renderClassSelect(onConfirm?: () => void): void {
  const wrap = byId('classSelect');
  if (!wrap) return;
  wrap.innerHTML = '';
  const classIcons: Record<string, string> = { gunner: '🔫', builder: '🔨', scavenger: '🎒' };
  Object.keys(CLASS_DEFS).forEach((key: string) => {
    const def = CLASS_DEFS[key];
    const icon = classIcons[key] || '⚔️';
    const card = document.createElement('div');
    card.className = 'class-card-modal' + (selectedClass === key ? ' active' : '');
    card.innerHTML = `
      <div class="class-img-slot">
        <span class="class-icon">${icon}</span>
        <span class="img-label">IMAGE SLOT</span>
      </div>
      <b class="class-name">${def.label}</b>
      <div class="class-perk">${def.desc}</div>
      <button class="class-pick-btn">CHOOSE ${def.label.toUpperCase()}</button>
    `;
    card.onclick = () => {
      setSelectedClass(key);
      renderClassSelect(onConfirm);
      if (onConfirm) onConfirm();
    };
    wrap.appendChild(card);
  });
}

export async function initMenu(): Promise<void> {
  await loadMeta();
  if (meta.name) {
    const input = byId<HTMLInputElement>('nameInput');
    if (input) input.value = meta.name;
  }
  renderMetaPanel();
  renderStartBonuses();
  renderMetaSkins();
  renderModeSelect();
  renderClassSelect();
  renderLeaderboard();
  setupMetaModalTabs();
}

// ---------------- Real multiplayer lobby (wired to the game server) ----------------
// Previously this simulated everything locally (fake bots, instant ready-check).
// Now `lobby.players`/`lobby.phase`/`lobby.countdownEndsAt` are mirrors of what
// the server's Room actually reports — see server/src/Room.ts for the
// waiting -> countdown -> active state machine this is reflecting.

let countdownTickTimer: ReturnType<typeof setInterval> | undefined;

function stopCountdownTicker(): void {
  if (countdownTickTimer) { clearInterval(countdownTickTimer); countdownTickTimer = undefined; }
}

function applyLobbyMessage(msg: NetLobbyMessage): void {
  const myId = getMyId();
  lobby.players = msg.players.map(p => ({ id: p.id, name: p.name, ready: p.ready, isLocal: p.id === myId }));
  lobby.phase = msg.phase;
  lobby.countdownEndsAt = msg.countdownEndsAt;
  lobby.onPlayersChanged?.();

  stopCountdownTicker();
  if (msg.phase === 'countdown') {
    // Re-render every 200ms so the countdown visibly ticks down instead of
    // only updating on the next actual state change from the server.
    countdownTickTimer = setInterval(() => lobby.onPlayersChanged?.(), 200);
  } else if (msg.phase === 'active') {
    lobby.onMatchStart?.();
  }
}

net.onLobby = applyLobbyMessage;

export function lobbySetReady(ready: boolean): void {
  sendReady(ready);
}

export function lobbyLeave(): void {
  stopCountdownTicker();
  disconnect();
  lobby.players = [];
  lobby.phase = 'waiting';
  lobby.countdownEndsAt = null;
  lobby.onPlayersChanged?.();
}

export function openLobby(): void {
  byId('lobbyOverlay').classList.remove('hidden');
  connect(playerName);
}

export function renderLobby(): void {
  const wrap = byId('lobbySlots');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const p = lobby.players[i];
    const slot = document.createElement('div');
    if (p) {
      slot.className = 'lobby-slot filled' + (p.ready ? ' ready' : '');
      slot.innerHTML = `<b class="name">${escapeHtml(p.name)}${p.isLocal ? ' (You)' : ''}</b><span class="state">${p.ready ? 'READY' : 'not ready'}</span>`;
    } else {
      slot.className = 'lobby-slot empty';
      slot.innerHTML = `<b class="name">—</b><span class="state">Waiting for player...</span>`;
    }
    wrap.appendChild(slot);
  }
  const total = lobby.players.length;
  const readyCount = lobby.players.filter(p => p.ready).length;
  const statusEl = byId('lobbyStatus');
  if (statusEl) {
    if (lobby.phase === 'countdown' && lobby.countdownEndsAt) {
      const secsLeft = Math.max(0, Math.ceil((lobby.countdownEndsAt - Date.now()) / 1000));
      statusEl.textContent = `All ready — starting in ${secsLeft}s...`;
    } else if (lobby.phase === 'active') {
      statusEl.textContent = 'Starting...';
    } else if (total < 2) {
      statusEl.textContent = `Waiting for players... (${total}/4)`;
    } else {
      statusEl.textContent = `Waiting for everyone to ready up (${readyCount} ready / ${total} joined)`;
    }
  }

  const me = lobby.players.find(p => p.isLocal);
  const readyBtn = byId('lobbyReadyBtn');
  if (readyBtn) {
    readyBtn.textContent = me?.ready ? 'NOT READY' : 'READY';
    readyBtn.classList.toggle('is-ready', !!me?.ready);
  }
}
