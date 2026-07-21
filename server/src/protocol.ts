// ===================== Protocol =====================
// Shared packet shapes and constants for client <-> server communication.
// Bumping PROTOCOL_VERSION is how a future client can detect it's talking to
// a server it no longer matches, instead of silently misbehaving.

export const PROTOCOL_VERSION = 1;

export const WORLD_W = 4200;
export const WORLD_H = 4200;

export const ROOM_MAX_PLAYERS = 4;
export const ROOM_MIN_PLAYERS = 2;

/** How long everyone must stay ready, uninterrupted, before a match actually starts. */
export const MATCH_START_COUNTDOWN_MS = 3000;

export const TICK_MS = 100;

export const ZOMBIE_MAX = 10;
export const ZOMBIE_SPAWN_INTERVAL_MS = 3000;
export const ZOMBIE_RADIUS = 22;
export const ZOMBIE_DAMAGE = 8;
export const ZOMBIE_HIT_COOLDOWN_MS = 600;
export const ZOMBIE_KILL_XP = 10;

export const BULLET_SPEED = 9.5;
export const BULLET_LIFE_TICKS = 60;
export const BULLET_RADIUS = 5;
export const BULLET_DAMAGE = 12;

export const PLAYER_RADIUS = 22;
export const PLAYER_MAX_HP = 100;

/** Generous per-message speed cap: distance implied by two move packets must
 *  not exceed this many world units per millisecond, or the move is dropped
 *  as implausible (basic anti-teleport, not full server-side physics). */
export const MAX_PLAYER_SPEED_PER_MS = 0.6;
export const MIN_SHOT_INTERVAL_MS = 150;

/** How long a disconnected player's state is kept around for a reconnect
 *  before it's discarded for good. */
export const SESSION_GRACE_MS = 30000;

export interface MovePacket {
  type: 'move';
  x: number;
  y: number;
  angle: number;
}

export interface ShootPacket {
  type: 'shoot';
  angle: number;
}

export interface ReadyPacket {
  type: 'ready';
  ready: boolean;
}

export type ClientPacket = MovePacket | ShootPacket | ReadyPacket;

export type RoomPhase = 'waiting' | 'countdown' | 'active';

export interface LobbyPlayerSnapshot {
  id: string;
  name: string;
  ready: boolean;
}

export interface LobbySnapshot {
  type: 'lobby';
  phase: RoomPhase;
  players: LobbyPlayerSnapshot[];
  countdownEndsAt: number | null;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  xp: number;
  level: number;
  xpToNext: number;
}

export interface ZombieSnapshot {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface BulletSnapshot {
  id: string;
  ownerId: string;
  x: number;
  y: number;
}

export function isMovePacket(value: any): value is MovePacket {
  return (
    value &&
    value.type === 'move' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.angle)
  );
}

export function isShootPacket(value: any): value is ShootPacket {
  return value && value.type === 'shoot' && Number.isFinite(value.angle);
}

export function isReadyPacket(value: any): value is ReadyPacket {
  return value && value.type === 'ready' && typeof value.ready === 'boolean';
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
