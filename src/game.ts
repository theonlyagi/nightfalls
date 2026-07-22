// ===================== NIGHTFALL.IO — Entry Point =====================

import {
  WORLD_W, WORLD_H, BASE_STATS, PERM_DEFS, CLASS_DEFS, BLOOD_MOON_MIN_GAP_MS, BLOOD_MOON_MAX_GAP_MS
} from './constants';
import {
  player, running, setRunning, paused, lastTime, setLastTime, camera,
  selectedClass, selectedMode, playerName, setPlayerName, dayNight, bloodMoon,
  meta, setBullets, setZombies, setStructures, setCrates, setParticles,
  setBursts, setPowerups, setBloodDecals, setWave, setWaveState, setIsBossWave,
  setActiveBoss, setShopOpen, setWeaponChoiceOpen, setMutationChoiceOpen,
  setDebugOpen, setSelectedBuild, setManualBuildAngle, lobby, settings,
  setSettingsOpenedMidRun, debugSpeedMultiplier, inNetMatch
} from './state';
import { byId, rand } from './utils';
import { loadSettings, saveSettings, applyUiScale } from './systems/storage';
import { setupInputListeners } from './systems/input';
import { setupTouchListeners } from './systems/touch';
import { updatePlayer, updateBullets, updateStructures, updateZombies, updateParticles } from './systems/update';
import { setXpCallbacks } from './systems/combat';
import { generateWorld, updateBloodMoon, updateDayNight, updateWaves, resetZombieId } from './systems/wave';
import { render } from './render/renderer';
import { initMatchSync, startNetMatch, stopNetMatch } from './net/matchSync';
import { disconnect as disconnectNet, isConnected as isNetConnected } from './net/socket';
import {
  renderMetaPanel, renderStartBonuses, renderMetaSkins, renderModeSelect,
  renderClassSelect, renderLeaderboard, updateStartBtnLabel, initMenu, openLobby, renderLobby, lobbySetReady, lobbyLeave
} from './ui/metaUI';
import {
  renderUpgradePanel, renderBuildBar, tryBuildOrUpgrade, selectBuild,
  openWeaponChoice, openMutationChoice, updateHud, toggleShop, toggleFactory,
  closeStructureInspector, upgradeInspectedStructure, removeInspectedStructure
} from './ui/shopUI';
import { openSettings, closeSettings, renderSettingsUI } from './ui/settingsUI';
import { setupDebugUI, toggleDebugPanel } from './ui/debugUI';
import { initCodexUI } from './ui/codexUI';

setXpCallbacks({
  onWeaponChoice: openWeaponChoice,
  onMutationChoice: openMutationChoice,
  onUpgradePanel: renderUpgradePanel
});

initMatchSync();

const canvas = byId<HTMLCanvasElement>('game');
const ctx = canvas.getContext('2d')!;

function resize(): void {
  const w = window.innerWidth || document.documentElement.clientWidth || 800;
  const h = window.innerHeight || document.documentElement.clientHeight || 600;
  canvas.width = w;
  canvas.height = h;
}

resize();
window.addEventListener('resize', resize);
setTimeout(resize, 50);
setTimeout(resize, 300);

function showFatalError(err: unknown): void {
  setRunning(false);
  let box = document.getElementById('fatalError');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fatalError';
    box.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(10,10,10,0.95);color:#ff8080;font-family:monospace;font-size:13px;padding:24px;overflow:auto;white-space:pre-wrap;';
    document.body.appendChild(box);
  }
  const message = (err instanceof Error) ? (err.message + '\n' + (err.stack || '')) : String(err);
  box.textContent = "NIGHTFALL.IO hit an error and stopped so it wouldn't just go black silently.\nPlease screenshot this and share it:\n\n" + message;
}

function loop(t: number): void {
  if (!running) return;
  if (paused) {
    setLastTime(t);
    requestAnimationFrame(loop);
    return;
  }
  try {
    let dt = (t - lastTime) * debugSpeedMultiplier;
    if (dt > 100 * debugSpeedMultiplier) dt = 100 * debugSpeedMultiplier;
    setLastTime(t);

    updatePlayer(dt, camera);
    // In a net match, zombies/bullets are server-authoritative (see
    // net/matchSync.ts) — running the local sim on top would fight the
    // server's snapshots. Structures/waves aren't synced yet either
    // (follow-up work), so they're disabled rather than half-working.
    if (!inNetMatch) {
      updateBullets(dt);
      updateStructures(dt);
      updateZombies(dt, dayNight.factor);
    }
    updateParticles(dt);
    updateBloodMoon();
    updateDayNight(dt);
    if (!inNetMatch) updateWaves(dt);
    updateHud();
    render(ctx, canvas);
  } catch (err) {
    showFatalError(err);
    return;
  }

  requestAnimationFrame(loop);
}

function resetGame(): void {
  const perm = meta.perm;
  const maxHp = BASE_STATS.maxHp + PERM_DEFS.hp.bonus(perm.hp);
  Object.assign(player, {
    x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0, angle: 0,
    radius: BASE_STATS.radius, hp: maxHp, maxHp: maxHp,
    maxSpeed: BASE_STATS.maxSpeed + PERM_DEFS.speed.bonus(perm.speed),
    accel: BASE_STATS.accel, friction: BASE_STATS.friction,
    damage: BASE_STATS.damage + PERM_DEFS.damage.bonus(perm.damage),
    bulletSpeed: BASE_STATS.bulletSpeed, bulletRadius: BASE_STATS.bulletRadius,
    fireRate: BASE_STATS.fireRate + PERM_DEFS.rate.bonus(perm.rate), lastShot: 0,
    level: 1, xp: 0, xpToNext: 50, statPoints: 0, points: 0,
    wood: 0, stone: 0, iron: 0, gold: 0, kills: 0, regen: BASE_STATS.regen + PERM_DEFS.regen.bonus(perm.regen), alive: true,
    buildDiscount: 1, resourceMul: 1, fortuneMul: 1 + PERM_DEFS.fortune.bonus(perm.fortune),
    instaKillUntil: 0, doubleXpUntil: 0,
    speedBoostUntil: 0, damageBoostUntil: 0, fireRateBoostUntil: 0, regenBoostUntil: 0,
    secondChance: false,
    skinTint: meta.equippedSkin,
    weapon: 'pistol', weaponChosen: false,
    mutation: null, mutationChosen: false, heat: 0, overheatedUntil: 0
  });

  CLASS_DEFS[selectedClass].apply(player);

  if (meta.startBonuses['headstart']) { player.wood += 50; player.stone += 50; }
  if (meta.startBonuses['nestegg']) { player.points += 30; }

  resetZombieId();
  setBullets([]); setZombies([]); setStructures([]); setCrates([]); setParticles([]); setBursts([]);
  setPowerups([]); setBloodDecals([]);
  setWave(0); setWaveState('idle'); setIsBossWave(false); setActiveBoss(null);

  dayNight.time = 0; dayNight.factor = 0; dayNight.isNight = false; dayNight.nightSpawnTimer = 6000; dayNight.nightCount = 0;
  bloodMoon.active = false; bloodMoon.endsAt = 0; bloodMoon.nextAt = 0;

  const bossBar = byId('bossBar'); if (bossBar) bossBar.classList.remove('show');
  setShopOpen(false); byId('shopPanel').classList.add('hidden');
  setWeaponChoiceOpen(false); byId('weaponChoicePanel').classList.add('hidden');
  setMutationChoiceOpen(false); byId('mutationChoicePanel').classList.add('hidden');
  setDebugOpen(false); byId('debugPanel').classList.add('hidden');
  byId('lobbyOverlay').classList.add('hidden');
  setSelectedBuild(null);
  setManualBuildAngle(null);

  generateWorld();
  renderUpgradePanel();
  renderBuildBar();
  byId('overlay').classList.add('hidden');
  setRunning(true);
  setLastTime(performance.now());
  requestAnimationFrame(loop);
}

// Event Bindings
byId('restartBtn').onclick = async () => {
  try {
    if (isNetConnected()) disconnectNet();
    stopNetMatch();
    byId('overlay').classList.add('hidden');
    byId('startOverlay').style.display = 'flex';
    renderMetaPanel();
    renderStartBonuses();
    renderMetaSkins();
    renderModeSelect();
    renderClassSelect();
    renderLeaderboard();
    updateStartBtnLabel();
  } catch (err) { showFatalError(err); }
};

byId('startBtn').onclick = () => {
  try {
    const nameVal = byId<HTMLInputElement>('nameInput').value.trim();
    setPlayerName(nameVal || 'Survivor');

    const modal = byId('classSelectModal');
    if (modal) {
      renderClassSelect(() => {
        modal.classList.add('hidden');
        byId('startOverlay').style.display = 'none';
        if (selectedMode === 'team') {
          openLobby();
        } else {
          resetGame();
        }
      });
      modal.classList.remove('hidden');
    } else {
      if (selectedMode === 'team') {
        byId('startOverlay').style.display = 'none';
        openLobby();
      } else {
        byId('startOverlay').style.display = 'none';
        resetGame();
      }
    }
  } catch (err) { showFatalError(err); }
};

byId('shopCloseBtn').onclick = () => {
  try { toggleShop(); } catch (err) { showFatalError(err); }
};

byId('factoryCloseBtn').onclick = () => {
  try { toggleFactory(); } catch (err) { showFatalError(err); }
};

byId('inspectorCloseBtn').onclick = () => {
  try { closeStructureInspector(); } catch (err) { showFatalError(err); }
};

byId('inspectorUpgradeBtn').onclick = () => {
  try { upgradeInspectedStructure(); } catch (err) { showFatalError(err); }
};

byId('inspectorRemoveBtn').onclick = () => {
  try { removeInspectedStructure(); } catch (err) { showFatalError(err); }
};

lobby.onPlayersChanged = renderLobby;
lobby.onMatchStart = () => {
  setTimeout(() => {
    byId('lobbyOverlay').classList.add('hidden');
    startNetMatch();
    resetGame();
  }, 600);
};

byId('lobbyReadyBtn').onclick = () => {
  try {
    const me = lobby.players.find(p => p.isLocal);
    lobbySetReady(!me?.ready);
  } catch (err) { showFatalError(err); }
};

byId('lobbyLeaveBtn').onclick = () => {
  try {
    lobbyLeave();
    byId('lobbyOverlay').classList.add('hidden');
    byId('startOverlay').style.display = 'flex';
  } catch (err) { showFatalError(err); }
};

byId('startSettingsBtn').onclick = () => { try { openSettings(); } catch (err) { showFatalError(err); } };
byId('hudSettingsBtn').onclick = () => { try { openSettings(); } catch (err) { showFatalError(err); } };
byId('settingsCloseBtn').onclick = () => { try { closeSettings(); } catch (err) { showFatalError(err); } };
byId('settingShakeBtn').onclick = () => {
  settings.screenShake = !settings.screenShake;
  saveSettings();
  renderSettingsUI();
};
byId('settingDamageNumBtn').onclick = () => {
  settings.damageNumbers = !settings.damageNumbers;
  saveSettings();
  renderSettingsUI();
};
byId('scaleSmallBtn').onclick = () => { settings.uiScale = 'small'; saveSettings(); applyUiScale(); renderSettingsUI(); };
byId('scaleMediumBtn').onclick = () => { settings.uiScale = 'medium'; saveSettings(); applyUiScale(); renderSettingsUI(); };
byId('scaleLargeBtn').onclick = () => { settings.uiScale = 'large'; saveSettings(); applyUiScale(); renderSettingsUI(); };

setupInputListeners(canvas, tryBuildOrUpgrade, selectBuild, renderBuildBar, toggleDebugPanel);
setupTouchListeners(canvas, tryBuildOrUpgrade, selectBuild, renderBuildBar);
setupDebugUI();
initCodexUI();
loadSettings();

// Toggleable How to Play UI
const helpBtn = byId('helpBtn');
const hintBox = byId('hint');
if (helpBtn && hintBox) {
  helpBtn.onclick = (e) => {
    e.stopPropagation();
    hintBox.classList.toggle('hidden');
  };
  window.addEventListener('click', () => {
    hintBox.classList.add('hidden');
  });
  hintBox.onclick = (e) => {
    e.stopPropagation();
  };
}

initMenu().catch(err => showFatalError(err));
