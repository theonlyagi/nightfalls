import { settings, setPaused, setSettingsOpenedMidRun, running, settingsOpenedMidRun } from '../state';
import { byId } from '../utils';

export function renderSettingsUI(): void {
  const shakeBtn = byId('settingShakeBtn');
  if (shakeBtn) {
    shakeBtn.textContent = settings.screenShake ? 'ON' : 'OFF';
    shakeBtn.classList.toggle('off', !settings.screenShake);
  }
  const dmgBtn = byId('settingDamageNumBtn');
  if (dmgBtn) {
    dmgBtn.textContent = settings.damageNumbers ? 'ON' : 'OFF';
    dmgBtn.classList.toggle('off', !settings.damageNumbers);
  }
  const sBtn = byId('scaleSmallBtn'); if (sBtn) sBtn.classList.toggle('active', settings.uiScale === 'small');
  const mBtn = byId('scaleMediumBtn'); if (mBtn) mBtn.classList.toggle('active', settings.uiScale === 'medium');
  const lBtn = byId('scaleLargeBtn'); if (lBtn) lBtn.classList.toggle('active', settings.uiScale === 'large');
}

export function openSettings(): void {
  setSettingsOpenedMidRun(running);
  if (running) setPaused(true);
  renderSettingsUI();
  byId('settingsOverlay').classList.remove('hidden');
}

export function closeSettings(): void {
  byId('settingsOverlay').classList.add('hidden');
  if (settingsOpenedMidRun) setPaused(false);
}
