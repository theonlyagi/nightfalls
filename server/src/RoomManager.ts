import { Room, PlayerState } from './Room.js';

let nextRoomId = 1;
function generateRoomId(): string {
  return 'room_' + (nextRoomId++);
}

/**
 * Owns the set of live rooms and assigns joining players to one with space,
 * creating a new room when every existing one is full. Destroys a room's
 * timers once its last player leaves so empty rooms don't leak resources.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();

  private handleRoomEmpty = (room: Room): void => {
    room.destroy();
    this.rooms.delete(room.id);
    console.log(`[room] ${room.id} destroyed (empty)`);
  };

  /** Finds a room with space that hasn't started its match yet, or creates one. */
  assign(): Room {
    for (const room of this.rooms.values()) {
      if (!room.isFull && room.roomPhase !== 'active') return room;
    }
    const room = new Room(generateRoomId(), this.handleRoomEmpty);
    this.rooms.set(room.id, room);
    console.log(`[room] ${room.id} created`);
    return room;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}

interface PendingSession {
  roomId: string;
  playerId: string;
  player: PlayerState;
  expiresAt: number;
}

/**
 * Keeps a disconnected player's state around briefly so a reconnect with the
 * same session token resumes as the same player instead of starting over.
 */
export class SessionStore {
  private pending = new Map<string, PendingSession>();

  constructor(private graceMs: number) {
    setInterval(() => this.sweep(), 5000);
  }

  save(token: string, roomId: string, player: PlayerState): void {
    this.pending.set(token, { roomId, playerId: player.id, player, expiresAt: Date.now() + this.graceMs });
  }

  /** Consumes (removes) a pending session if present and not expired. */
  take(token: string): PendingSession | undefined {
    const entry = this.pending.get(token);
    if (!entry) return undefined;
    this.pending.delete(token);
    if (entry.expiresAt < Date.now()) return undefined;
    return entry;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [token, entry] of this.pending) {
      if (entry.expiresAt < now) this.pending.delete(token);
    }
  }
}
