import uWS from 'uWebSockets.js';
import crypto from 'node:crypto';
import { PROTOCOL_VERSION, SESSION_GRACE_MS, isMovePacket, isShootPacket } from './protocol.js';
import { ConnectionData, PlayerState } from './Room.js';
import { RoomManager, SessionStore } from './RoomManager.js';

// Final infrastructure pass: rooms isolate matches from each other, sessions
// survive a reconnect, moves/shots are validated instead of trusted outright,
// and connections are restricted to known origins. Collision, XP/leveling,
// and player HP/death are implemented in Room.ts. Still deliberately out of
// scope here: structures, day/night & Blood Moon, shop, evolutions/mutations
// — those are content systems that can follow the same sync pattern once
// this foundation is in place, not infrastructure risk.

const PORT = Number(process.env.PORT) || 8081;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

let nextPlayerId = 1;
function generatePlayerId(): string {
  return 'player_' + (nextPlayerId++);
}

const roomManager = new RoomManager();
const sessions = new SessionStore(SESSION_GRACE_MS);

/** Bridges `upgrade` (sync) to `open` (fires shortly after) for restored session state. */
const pendingRestore = new Map<string, PlayerState | undefined>();

const app = uWS.App();

app.get('/health', (res) => {
  res.writeStatus('200 OK').writeHeader('Content-Type', 'text/plain').end('ok');
});

app.ws<ConnectionData>('/ws', {
  upgrade: (res, req, context) => {
    const origin = req.getHeader('origin');
    // Missing Origin is normal for non-browser clients (server-to-server,
    // native apps, test scripts); a *present* origin must be on the allowlist.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[reject] upgrade from disallowed origin: ${origin}`);
      res.writeStatus('403 Forbidden').end('origin not allowed');
      return;
    }

    const token = req.getQuery('token') || '';
    const secWebSocketKey = req.getHeader('sec-websocket-key');
    const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
    const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

    const pending = token ? sessions.take(token) : undefined;

    let roomId: string;
    let playerId: string;
    let sessionToken: string;
    let restored: PlayerState | undefined;

    if (pending) {
      const existingRoom = roomManager.get(pending.roomId);
      const room = existingRoom && !existingRoom.isFull ? existingRoom : roomManager.assign();
      roomId = room.id;
      playerId = pending.playerId;
      sessionToken = token;
      restored = pending.player;
      console.log(`[rejoin] ${playerId} resuming in ${roomId}`);
    } else {
      roomId = roomManager.assign().id;
      playerId = generatePlayerId();
      sessionToken = crypto.randomUUID();
    }

    // Must be set *before* res.upgrade() — uWS can invoke the `open` handler
    // synchronously as part of that call, so setting this after would race it.
    pendingRestore.set(playerId, restored);

    res.upgrade<ConnectionData>(
      { id: playerId, sessionToken, connectedAt: Date.now(), roomId },
      secWebSocketKey, secWebSocketProtocol, secWebSocketExtensions,
      context
    );
  },

  open: (ws) => {
    const data = ws.getUserData();
    const room = roomManager.get(data.roomId)!;
    const restored = pendingRestore.get(data.id);
    pendingRestore.delete(data.id);

    room.addConnection(ws, data.id, restored);
    console.log(`[join] ${data.id} connected to ${room.id} (${room.size} in room, ${roomManager.roomCount} rooms total)`);

    ws.send(JSON.stringify({
      type: 'welcome',
      id: data.id,
      sessionToken: data.sessionToken,
      roomId: data.roomId,
      protocolVersion: PROTOCOL_VERSION,
    }));
  },

  message: (ws, message, isBinary) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(message).toString('utf-8'));
    } catch {
      return; // ignore malformed messages
    }

    const data = ws.getUserData();
    const room = roomManager.get(data.roomId);
    if (!room) return;

    if (isMovePacket(parsed)) {
      room.handleMove(data.id, parsed.x, parsed.y);
      return;
    }
    if (isShootPacket(parsed)) {
      room.handleShoot(data.id, parsed.angle);
      return;
    }
  },

  close: (ws, code, message) => {
    const data = ws.getUserData();
    const room = roomManager.get(data.roomId);
    const player = room?.removeConnection(data.id);
    console.log(`[leave] ${data.id} disconnected from ${data.roomId}, code ${code}`);
    if (player) {
      sessions.save(data.sessionToken, data.roomId, player);
    }
  },
});

app.listen(PORT, (token) => {
  if (token) {
    console.log(`[server] listening on port ${PORT} (protocol v${PROTOCOL_VERSION})`);
    console.log(`[server] allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  } else {
    console.error(`[server] failed to listen on port ${PORT}`);
  }
});
