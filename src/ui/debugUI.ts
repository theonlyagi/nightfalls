import {
  debugUnlocked, setDebugUnlocked, debugOpen, setDebugOpen,
  godMode, setGodMode, running, player, zombies, setZombies, bloodMoon,
  setDebugSpeedMultiplier
} from '../state';
import { DEBUG_PASSWORD, BLOOD_MOON_DURATION_MS, BASE_STATS } from '../constants';
import { byId, clamp } from '../utils';
import { startWave } from '../systems/wave';
import { openWeaponChoice, openMutationChoice, renderUpgradePanel } from './shopUI';
import { showBanner, zombieDied } from '../systems/combat';

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
  
  player.level = target;
  player.statPoints = target - 1;
  player.maxHp = BASE_STATS.maxHp + (target - 1) * 8;
  player.hp = player.maxHp;
  
  let xpNeeded = 50;
  for (let l = 1; l < target; l++) {
    xpNeeded = Math.floor(xpNeeded * 1.32);
  }
  player.xpToNext = xpNeeded;
  player.xp = 0;

  if (player.level >= 15 && !player.weaponChosen) openWeaponChoice();
  if (player.level >= 25 && !player.mutationChosen) openMutationChoice();
  renderUpgradePanel();
}

export function cheatSetWave(target: number): void {
  target = clamp(Math.floor(target) || 1, 1, 999);
  setZombies([]);
  startWave(target);
}

export function cheatKillAll(): void {
  const activeZombies = [...zombies];
  for (const z of activeZombies) {
    zombieDied(z);
  }
  setZombies([]);
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
  byId('debugKillAllBtn').onclick = () => { cheatKillAll(); };
  byId('debugSkipLevel10Btn').onclick = () => { cheatSetLevel(10); };
  const speedSelect = byId<HTMLSelectElement>('debugSpeedSelect');
  if (speedSelect) {
    speedSelect.onchange = (e) => {
      const val = Number((e.target as HTMLSelectElement).value) || 1;
      setDebugSpeedMultiplier(val);
    };
  }
  byId('debugGodBtn').onclick = () => {
    setGodMode(!godMode);
    byId('debugGodBtn').textContent = 'GOD MODE: ' + (godMode ? 'ON' : 'OFF');
  };
  byId('debugBloodMoonBtn').onclick = () => {
    bloodMoon.active = true;
    bloodMoon.endsAt = performance.now() + BLOOD_MOON_DURATION_MS;
    showBanner('BLOOD MOON RISING', 'Zombies spawn faster and hit harder...', 'blood');
  };
}
