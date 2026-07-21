// ===================== Multiplayer WebSocket client =====================
// Thin wrapper around a WebSocket connection to the game server. Owns
// connection lifecycle and session-token persistence (so a dropped
// connection reconnects as the *same* player instead of a stranger — see
// server/src/RoomManager.ts's SessionStore). Nothing here touches game
// state directly; callers wire the onXxx callbacks to actually apply
// incoming data, same pattern as the existing `lobby.onPlayersChanged` /
// `lobby.onMatchStart` hooks in state.ts.

import { WS_URL } from '../constants';
import { StructureKind } from '../types';

const SESSION_TOKEN_KEY = 'nightfall_session_token';

export interface NetLobbyPlayer { id: string; name: string; ready: boolean; }
export interface NetLobbyMessage {
  type: 'lobby';
  phase: 'waiting' | 'countdown' | 'active';
  players: NetLobbyPlayer[];
  countdownEndsAt: number | null;
}
export interface NetWelcomeMessage {
  type: 'welcome';
  id: string;
  sessionToken: string;
  roomId: string;
  protocolVersion: number;
}
export interface NetPlayerSnapshot {
  id: string; name: string; x: number; y: number; angle: number;
  hp: number; maxHp: number; alive: boolean;
  xp: number; level: number; xpToNext: number;
}
export interface NetPlayersMessage { type: 'players'; players: NetPlayerSnapshot[]; }
export interface NetZombieSnapshot { id: string; x: number; y: number; hp: number; maxHp: number; }
export interface NetZombiesMessage { type: 'zombies'; zombies: NetZombieSnapshot[]; }
export interface NetBulletSnapshot { id: string; ownerId: string; x: number; y: number; }
export interface NetBulletsMessage { type: 'bullets'; bullets: NetBulletSnapshot[]; }
export interface NetStructureSnapshot {
  id: string; type: StructureKind; x: number; y: number; angle: number; aimAngle: number;
  tier: number; level: number; hp: number; maxHp: number;
}
export interface NetStructuresMessage { type: 'structures'; structures: NetStructureSnapshot[]; }

let socket: WebSocket | null = null;
let myId: string | null = null;
let myRoomId: string | null = null;

export const net = {
  onWelcome: null as ((msg: NetWelcomeMessage) => void) | null,
  onLobby: null as ((msg: NetLobbyMessage) => void) | null,
  onPlayers: null as ((msg: NetPlayersMessage) => void) | null,
  onZombies: null as ((msg: NetZombiesMessage) => void) | null,
  onBullets: null as ((msg: NetBulletsMessage) => void) | null,
  onStructures: null as ((msg: NetStructuresMessage) => void) | null,
  onDisconnected: null as (() => void) | null,
};

export function isConnected(): boolean {
  return !!socket && socket.readyState === WebSocket.OPEN;
}

export function getMyId(): string | null { return myId; }
export function getMyRoomId(): string | null { return myRoomId; }

function getSavedToken(): string {
  try { return localStorage.getItem(SESSION_TOKEN_KEY) || ''; } catch { return ''; }
}

function saveToken(token: string): void {
  try { localStorage.setItem(SESSION_TOKEN_KEY, token); } catch { /* e.g. private browsing */ }
}

/** Opens a connection. `name` is sent for display purposes only — the server
 *  trims/caps/defaults it, never trust it as an identity. */
export function connect(name: string): void {
  if (socket) disconnect();

  const token = getSavedToken();
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  params.set('name', name);
  const url = WS_URL + '?' + params.toString();

  socket = new WebSocket(url);

  socket.onmessage = (e: MessageEvent) => {
    let msg: any;
    try { msg = JSON.parse(e.data); } catch { return; }

    switch (msg.type) {
      case 'welcome':
        myId = msg.id;
        myRoomId = msg.roomId;
        saveToken(msg.sessionToken);
        net.onWelcome?.(msg);
        break;
      case 'lobby':
        net.onLobby?.(msg);
        break;
      case 'players':
        net.onPlayers?.(msg);
        break;
      case 'zombies':
        net.onZombies?.(msg);
        break;
      case 'bullets':
        net.onBullets?.(msg);
        break;
      case 'structures':
        net.onStructures?.(msg);
        break;
    }
  };

  socket.onclose = () => {
    socket = null;
    myId = null;
    myRoomId = null;
    net.onDisconnected?.();
  };
}

/** A deliberate, local disconnect — doesn't fire onDisconnected (that's for
 *  the connection dropping unexpectedly, e.g. server restart or network loss). */
export function disconnect(): void {
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  myId = null;
  myRoomId = null;
}

function send(payload: object): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function sendReady(ready: boolean): void { send({ type: 'ready', ready }); }
export function sendMove(x: number, y: number, angle: number): void { send({ type: 'move', x, y, angle }); }
export function sendShoot(angle: number): void { send({ type: 'shoot', angle }); }
export function sendBuild(kind: StructureKind, x: number, y: number, angle: number): void {
  send({ type: 'build', kind, x, y, angle });
}
export function sendUpgrade(structureId: string): void { send({ type: 'upgrade', structureId }); }
