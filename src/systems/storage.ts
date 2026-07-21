import { MetaProgress, LeaderboardEntry } from '../types';
import { meta, setMeta, defaultMeta, hasStorage, settings, setSettings, defaultSettings } from '../state';
import { SETTINGS_KEY } from '../constants';

export async function loadMeta(): Promise<void> {
  if (!hasStorage) return;
  try {
    const r = await window.storage.get('meta_progress', false);
    if (r && r.value) {
      const loaded = JSON.parse(r.value);
      const newMeta = Object.assign(defaultMeta(), loaded);
      newMeta.perm = Object.assign(defaultMeta().perm, loaded.perm || {});
      newMeta.startBonuses = Object.assign({}, loaded.startBonuses || {});
      setMeta(newMeta);
    }
  } catch (e) { /* not found is fine */ }
}

export async function saveMeta(): Promise<void> {
  if (!hasStorage) return;
  try {
    await window.storage.set('meta_progress', JSON.stringify(meta), false);
  } catch (e) {
    console.error('meta save failed', e);
  }
}

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!hasStorage) return [];
  try {
    const r = await window.storage.get('leaderboard_top10', true);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) { /* none yet */ }
  return [];
}

export async function submitScore(entry: LeaderboardEntry): Promise<void> {
  if (!hasStorage) return;
  try {
    let list = await loadLeaderboard();
    list.push(entry);
    list.sort((a, b) => b.wave - a.wave || b.kills - a.kills);
    list = list.slice(0, 10);
    await window.storage!.set('leaderboard_top10', JSON.stringify(list), true);
  } catch (e) {
    console.error('leaderboard submit failed', e);
  }
}

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      setSettings(Object.assign(defaultSettings(), JSON.parse(raw)));
    }
  } catch (e) { /* defaults are fine */ }
  applyUiScale();
}

export function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) { /* storage unavailable */ }
}

export function applyUiScale(): void {
  document.body.classList.remove('ui-scale-small', 'ui-scale-medium', 'ui-scale-large');
  document.body.classList.add('ui-scale-' + settings.uiScale);
}
