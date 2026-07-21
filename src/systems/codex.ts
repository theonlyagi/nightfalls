import { ZombieKind } from '../types';

export interface CodexData {
  encountered: Record<ZombieKind, boolean>;
  firstKilled: Record<ZombieKind, string>;
}

const CODEX_KEY = 'nightfalls_codex_data_v1';

export const codex: CodexData = {
  encountered: {
    normal: false,
    scout: false,
    brute: false,
    spitter: false,
    exploder: false,
    wolf: false,
    boss: false,
    spider: false,
    witch: false
  },
  firstKilled: {
    normal: '',
    scout: '',
    brute: '',
    spitter: '',
    exploder: '',
    wolf: '',
    boss: '',
    spider: '',
    witch: ''
  }
};

export function loadCodex(): void {
  try {
    const raw = localStorage.getItem(CODEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.encountered) Object.assign(codex.encountered, parsed.encountered);
      if (parsed.firstKilled) Object.assign(codex.firstKilled, parsed.firstKilled);
    }
  } catch (err) {
    console.error('Failed to load bestiary codex data:', err);
  }
}

export function saveCodex(): void {
  try {
    localStorage.setItem(CODEX_KEY, JSON.stringify(codex));
  } catch (err) {
    console.error('Failed to save bestiary codex data:', err);
  }
}

export function registerEncounter(type: ZombieKind): void {
  if (codex.encountered[type] === undefined) return; // 알 수 없는 몬스터 예외 처리
  if (!codex.encountered[type]) {
    codex.encountered[type] = true;
    saveCodex();
  }
}

export function registerKill(type: ZombieKind): void {
  if (codex.firstKilled[type] === undefined) return;
  // 조우하지 않은 몬스터를 죽였다면 조우도 함께 등록
  registerEncounter(type);
  
  if (!codex.firstKilled[type]) {
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    codex.firstKilled[type] = dateStr;
    saveCodex();
  }
}
