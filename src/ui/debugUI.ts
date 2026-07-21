import {
  debugUnlocked, setDebugUnlocked, debugOpen, setDebugOpen,
  godMode, setGodMode, running, player, setZombies, bloodMoon
} from '../state';
import { DEBUG_PASSWORD, BLOOD_MOON_DURATION_MS } from '../constants';
import { byId, clamp } from '../utils';
import { startWave } from '../systems/wave';
import { openWeaponChoice, openMutationChoice, renderUpgradePanel } from './shopUI';
import { showBanner } from '../systems/combat';
import { lobbySimulateJoin } from './metaUI';

export function toggleDebugPanel(): void {
  const lobbyOpen = !byId('lobbyOverlay').classList.contains('hidden');
  if (!running && !lobbyOpen) return;
  setDebugOpen(!debugOpen);
  const panel = byId('debugPanel');
  if (debugOpen) {
    panel.classList.remove('hidden');
    byId('debugLockStep').classList.toggle('hidden', debugUnlocked);
    byId('debugControls').classList.toggle('hidden', !debugUnlocked);
    if (!debugUnlocked) {
      const input = byId<HTMLInputElement>('debugPassInput');
      input.value = '';
      byId('debugLockMsg').textContent = '';
      setTimeout(() => input.focus(), 0);
    }
  } else {
    panel.classList.add('hidden');
  }
}

export function tryDebugUnlock(): void {
  const input = byId<HTMLInputElement>('debugPassInput');
  if (input.value === DEBUG_PASSWORD) {
    setDebugUnlocked(true);
    byId('debugLockStep').classList.add('hidden');
    byId('debugControls').classList.remove('hidden');
  } else {
    byId('debugLockMsg').textContent = 'wrong password';
    input.value = '';
    input.focus();
  }
}

export function cheatSetLevel(target: number): void {
  target = clamp(Math.floor(target) || 1, 1, 999);
  while (player.level < target) {
    player.level++;
    player.statPoints++;
    player.xpToNext = Math.floor(player.xpToNext * 1.32);
    player.maxHp += 8;
    player.hp = Math.min(player.maxHp, player.hp + 8);
  }
  if (player.level >= 15 && !player.weaponChosen) openWeaponChoice();
  if (player.level >= 25 && !player.mutationChosen) openMutationChoice();
  renderUpgradePanel();
}

export function cheatSetWave(target: number): void {
  target = clamp(Math.floor(target) || 1, 1, 999);
  setZombies([]);
  startWave(target);
}

export function setupDebugUI(): void {
  const debugBox = byId('debugBox');
  if (!debugBox) return;

  debugBox.addEventListener('keydown', (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !debugUnlocked) tryDebugUnlock();
  });
  debugBox.addEventListener('keyup', (e: KeyboardEvent) => e.stopPropagation());

  byId('debugUnlockBtn').onclick = tryDebugUnlock;
  byId('debugCloseBtn').onclick = () => toggleDebugPanel();
  byId('debugSetLevelBtn').onclick = () => {
    cheatSetLevel(Number(byId<HTMLInputElement>('debugLevelInput').value));
  };
  byId('debugAddPointsBtn').onclick = () => {
    const n = Math.floor(Number(byId<HTMLInputElement>('debugPointsInput').value)) || 0;
    player.points = Math.max(0, player.points + n);
  };
  byId('debugSetPointsBtn').onclick = () => {
    player.points = Math.max(0, Math.floor(Number(byId<HTMLInputElement>('debugPointsInput').value)) || 0);
  };
  byId('debugSetWaveBtn').onclick = () => {
    cheatSetWave(Number(byId<HTMLInputElement>('debugWaveInput').value));
  };
  byId('debugAddResBtn').onclick = () => {
    const n = Math.max(0, Math.floor(Number(byId<HTMLInputElement>('debugResInput').value)) || 0);
    player.wood += n; player.stone += n;
  };
  byId('debugFullHealBtn').onclick = () => { player.hp = player.maxHp; };
  byId('debugGodBtn').onclick = () => {
    setGodMode(!godMode);
    byId('debugGodBtn').textContent = 'GOD MODE: ' + (godMode ? 'ON' : 'OFF');
  };
  byId('debugBloodMoonBtn').onclick = () => {
    bloodMoon.active = true;
    bloodMoon.endsAt = performance.now() + BLOOD_MOON_DURATION_MS;
    showBanner('BLOOD MOON RISING', 'Zombies spawn faster and hit harder...', 'blood');
  };
  byId('debugAddFakePlayerBtn').onclick = () => { lobbySimulateJoin(); };
}
