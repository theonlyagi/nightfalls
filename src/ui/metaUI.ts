import { MetaPerm } from '../types';
import {
  meta, selectedMode, setSelectedMode, selectedClass, setSelectedClass,
  playerName, lobby, lobbyFakePlayerCount, setLobbyFakePlayerCount
} from '../state';
import { PERM_DEFS, START_BONUS_DEFS, META_SKIN_DEFS, MODE_DEFS, CLASS_DEFS } from '../constants';
import { byId, escapeHtml } from '../utils';
import { saveMeta, loadLeaderboard, loadMeta } from '../systems/storage';

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
  equipDefault.innerHTML = `<b>Default</b><div class="cost">${meta.equippedSkin === null ? 'EQUIPPED' : 'EQUIP'}</div>`;
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
    btn.innerHTML = `<b>${s.label}</b><div class="cost">${owned ? (equipped ? 'EQUIPPED' : 'EQUIP') : s.cost + ' pts'}</div>`;
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
    <div class="lb-row">
      <span class="lb-rank">#${i + 1}</span>
      <span>${escapeHtml(e.name || 'Survivor')}</span>
      <span>wave ${e.wave}</span>
      <span>${e.kills} kills</span>
    </div>
  `).join('');
}

export function renderModeSelect(): void {
  const wrap = byId('modeSelect');
  if (!wrap) return;
  wrap.innerHTML = '';
  const modeInfo: Record<string, { title: string; icon: string }> = {
    solo: { title: 'Singleplayer', icon: '👤' },
    team: { title: 'Team Mode', icon: '👥' }
  };
  (Object.keys(MODE_DEFS) as ('solo' | 'team')[]).forEach(key => {
    const def = MODE_DEFS[key];
    const info = modeInfo[key] || { title: def.label, icon: '⚔️' };
    const card = document.createElement('div');
    card.className = 'mode-card io-border io-shadow-solid-sm squishy-hover squishy' + (selectedMode === key ? ' active' : '');
    card.innerHTML = `
      <b class="mode-title">${info.icon} ${info.title}</b>
      <span class="mode-desc">${def.desc}</span>
    `;
    card.onclick = () => { setSelectedMode(key); renderModeSelect(); updateStartBtnLabel(); };
    wrap.appendChild(card);
  });
}

export function updateStartBtnLabel(): void {
  const btn = byId('startBtn');
  if (btn) btn.textContent = selectedMode === 'team' ? 'QUEUE UP' : 'ENTER THE FOREST';
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

  // Tab Switcher for Bottom Interaction Dock
  const btnUpgrades = byId('btnMetaUpgrades');
  const btnBonuses = byId('btnStartBonuses');
  const btnSkins = byId('btnMetaSkins');

  const tabUpgrades = byId('metaUpgrades');
  const tabBonuses = byId('startBonuses');
  const tabSkins = byId('metaSkins');

  if (btnUpgrades && btnBonuses && btnSkins && tabUpgrades && tabBonuses && tabSkins) {
    btnUpgrades.onclick = () => {
      btnUpgrades.classList.add('active');
      btnBonuses.classList.remove('active');
      btnSkins.classList.remove('active');

      tabUpgrades.classList.remove('hidden');
      tabUpgrades.classList.add('active');
      tabBonuses.classList.add('hidden');
      tabBonuses.classList.remove('active');
      tabSkins.classList.add('hidden');
      tabSkins.classList.remove('active');
    };

    btnBonuses.onclick = () => {
      btnBonuses.classList.add('active');
      btnUpgrades.classList.remove('active');
      btnSkins.classList.remove('active');

      tabBonuses.classList.remove('hidden');
      tabBonuses.classList.add('active');
      tabUpgrades.classList.add('hidden');
      tabUpgrades.classList.remove('active');
      tabSkins.classList.add('hidden');
      tabSkins.classList.remove('active');
    };

    btnSkins.onclick = () => {
      btnSkins.classList.add('active');
      btnUpgrades.classList.remove('active');
      btnBonuses.classList.remove('active');

      tabSkins.classList.remove('hidden');
      tabSkins.classList.add('active');
      tabUpgrades.classList.add('hidden');
      tabUpgrades.classList.remove('active');
      tabBonuses.classList.add('hidden');
      tabBonuses.classList.remove('active');
    };
  }
}

export function lobbyCheckAllReady(): void {
  if (lobby.players.length >= 2 && lobby.players.length <= 4 && lobby.players.every(p => p.ready)) {
    lobby.onMatchStart?.();
  }
}

export function lobbyJoin(name: string): void {
  lobby.players = [{ id: 'local', name, ready: false, isLocal: true }];
  setLobbyFakePlayerCount(0);
  lobby.onPlayersChanged?.();
}

export function lobbySetReady(ready: boolean): void {
  const me = lobby.players.find(p => p.isLocal);
  if (me) me.ready = ready;
  lobby.onPlayersChanged?.();
  lobbyCheckAllReady();
}

export function lobbyLeave(): void {
  lobby.players = [];
  lobby.onPlayersChanged?.();
}

export function lobbySimulateJoin(): void {
  if (lobby.players.length >= 4) return;
  const count = lobbyFakePlayerCount + 1;
  setLobbyFakePlayerCount(count);
  lobby.players.push({ id: 'bot' + count, name: 'Bot ' + count, ready: true, isLocal: false });
  lobby.onPlayersChanged?.();
  lobbyCheckAllReady();
}

export function openLobby(): void {
  byId('lobbyOverlay').classList.remove('hidden');
  lobbyJoin(playerName);
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
    if (total < 2) statusEl.textContent = `Waiting for players... (${total}/4)`;
    else if (readyCount < total) statusEl.textContent = `Waiting for everyone to ready up (${readyCount} ready / ${total} joined)`;
    else statusEl.textContent = 'All ready — starting...';
  }

  const me = lobby.players.find(p => p.isLocal);
  const readyBtn = byId('lobbyReadyBtn');
  if (readyBtn) {
    readyBtn.textContent = me?.ready ? 'NOT READY' : 'READY';
    readyBtn.classList.toggle('is-ready', !!me?.ready);
  }
}
