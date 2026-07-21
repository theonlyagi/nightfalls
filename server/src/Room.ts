import uWS from 'uWebSockets.js';
import {
  WORLD_W, WORLD_H, ROOM_MAX_PLAYERS, TICK_MS,
  ZOMBIE_MAX, ZOMBIE_SPAWN_INTERVAL_MS, ZOMBIE_RADIUS, ZOMBIE_DAMAGE, ZOMBIE_HIT_COOLDOWN_MS, ZOMBIE_KILL_XP,
  BULLET_SPEED, BULLET_LIFE_TICKS, BULLET_RADIUS, BULLET_DAMAGE,
  PLAYER_RADIUS, PLAYER_MAX_HP, MAX_PLAYER_SPEED_PER_MS, MIN_SHOT_INTERVAL_MS,
  clamp, dist,
} from './protocol.js';

/** Generous multiplier on top of the base speed cap to absorb normal network jitter. */
const SPEED_CHECK_SLACK = 1.5;

export interface ConnectionData {
  id: string;
  sessionToken: string;
  connectedAt: number;
  roomId: string;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  xp: number;
  level: number;
  xpToNext: number;
  lastMoveAt: number;
  lastMoveX: number;
  lastMoveY: number;
  lastShotAt: number;
}

export interface ZombieState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lastHitPlayerAt: number;
}

export interface BulletState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

let nextZombieId = 1;
function generateZombieId(): string {
  return 'zombie_' + (nextZombieId++);
}

let nextBulletId = 1;
function generateBulletId(): string {
  return 'bullet_' + (nextBulletId++);
}

/**
 * One isolated match. Owns its own players/zombies/bullets and its own tick —
 * nothing here is visible to, or affected by, any other room. Created on
 * demand by RoomManager and torn down (timers cleared) once empty.
 */
export class Room {
  readonly id: string;
  readonly sockets = new Map<string, uWS.WebSocket<ConnectionData>>();
  readonly players = new Map<string, PlayerState>();
  readonly zombies = new Map<string, ZombieState>();
  readonly bullets = new Map<string, BulletState>();

  private zombieSpawnTimer: ReturnType<typeof setInterval>;
  private tickTimer: ReturnType<typeof setInterval>;
  private onEmpty: (room: Room) => void;

  constructor(id: string, onEmpty: (room: Room) => void) {
    this.id = id;
    this.onEmpty = onEmpty;
    this.zombieSpawnTimer = setInterval(() => this.maybeSpawnZombie(), ZOMBIE_SPAWN_INTERVAL_MS);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  get size(): number {
    return this.sockets.size;
  }

  get isFull(): boolean {
    return this.size >= ROOM_MAX_PLAYERS;
  }

  destroy(): void {
    clearInterval(this.zombieSpawnTimer);
    clearInterval(this.tickTimer);
  }

  private broadcast(payload: string): void {
    for (const ws of this.sockets.values()) {
      ws.send(payload);
    }
  }

  private broadcastPlayers(): void {
    this.broadcast(JSON.stringify({
      type: 'players',
      players: Array.from(this.players.values()).map(p => ({
        id: p.id, x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, alive: p.alive,
        xp: p.xp, level: p.level, xpToNext: p.xpToNext,
      })),
    }));
  }

  private broadcastZombies(): void {
    this.broadcast(JSON.stringify({
      type: 'zombies',
      zombies: Array.from(this.zombies.values()).map(z => ({
        id: z.id, x: z.x, y: z.y, hp: z.hp, maxHp: z.maxHp,
      })),
    }));
  }

  private broadcastBullets(): void {
    this.broadcast(JSON.stringify({
      type: 'bullets',
      bullets: Array.from(this.bullets.values()).map(b => ({
        id: b.id, ownerId: b.ownerId, x: b.x, y: b.y,
      })),
    }));
  }

  /** Adds a live connection. `restored` carries prior state on a reconnect. */
  addConnection(ws: uWS.WebSocket<ConnectionData>, id: string, restored?: PlayerState): void {
    this.sockets.set(id, ws);
    const now = Date.now();
    this.players.set(id, restored ?? {
      id, x: WORLD_W / 2, y: WORLD_H / 2,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, alive: true,
      xp: 0, level: 1, xpToNext: 50,
      lastMoveAt: now, lastMoveX: WORLD_W / 2, lastMoveY: WORLD_H / 2,
      lastShotAt: 0,
    });

    // Bring the new/rejoining client up to date immediately.
    ws.send(JSON.stringify({ type: 'players', players: Array.from(this.players.values()) }));
    ws.send(JSON.stringify({ type: 'zombies', zombies: Array.from(this.zombies.values()) }));
    ws.send(JSON.stringify({ type: 'bullets', bullets: Array.from(this.bullets.values()) }));

    this.broadcastPlayers();
  }

  removeConnection(id: string): PlayerState | undefined {
    this.sockets.delete(id);
    const player = this.players.get(id);
    this.players.delete(id);
    this.broadcastPlayers();
    if (this.sockets.size === 0) {
      this.onEmpty(this);
    }
    return player;
  }

  /** Validated move: rejects implausible speed/teleport, clamps to world bounds. */
  handleMove(id: string, x: number, y: number): void {
    const p = this.players.get(id);
    if (!p || !p.alive) return;

    const now = Date.now();
    const dt = now - p.lastMoveAt;
    const distance = dist(p.lastMoveX, p.lastMoveY, x, y);
    // dt<=0 guards against duplicate/out-of-order timestamps dividing by zero;
    // a generous slack factor avoids false rejections from normal network jitter.
    if (dt > 0) {
      const impliedSpeed = distance / dt;
      if (impliedSpeed > MAX_PLAYER_SPEED_PER_MS * SPEED_CHECK_SLACK) {
        console.warn(`[reject] ${id} implausible move: ${impliedSpeed.toFixed(3)} u/ms`);
        return;
      }
    }

    p.x = clamp(x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
    p.y = clamp(y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);
    p.lastMoveAt = now;
    p.lastMoveX = p.x;
    p.lastMoveY = p.y;
    this.broadcastPlayers();
  }

  /** Validated shoot: rate-limited, ignored for dead players. */
  handleShoot(id: string, angle: number): void {
    const p = this.players.get(id);
    if (!p || !p.alive) return;

    const now = Date.now();
    if (now - p.lastShotAt < MIN_SHOT_INTERVAL_MS) return;
    p.lastShotAt = now;

    const bid = generateBulletId();
    this.bullets.set(bid, {
      id: bid, ownerId: id,
      x: p.x, y: p.y,
      vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED,
      life: BULLET_LIFE_TICKS,
    });
  }

  private maybeSpawnZombie(): void {
    if (this.zombies.size >= ZOMBIE_MAX) return;
    const id = generateZombieId();
    this.zombies.set(id, {
      id,
      x: Math.random() * WORLD_W,
      y: Math.random() * WORLD_H,
      hp: 30, maxHp: 30,
      lastHitPlayerAt: 0,
    });
  }

  private tickZombiesMovement(): void {
    for (const z of this.zombies.values()) {
      z.x = clamp(z.x + (Math.random() - 0.5) * 20, 0, WORLD_W);
      z.y = clamp(z.y + (Math.random() - 0.5) * 20, 0, WORLD_H);
    }
  }

  private tickBulletsMovement(): void {
    for (const b of this.bullets.values()) {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;
      const outOfBounds = b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H;
      if (b.life <= 0 || outOfBounds) {
        this.bullets.delete(b.id);
      }
    }
  }

  /** Bullets vs zombies, and zombies vs players. Kills grant XP to the bullet owner. */
  private resolveCollisions(): void {
    const now = Date.now();

    for (const b of this.bullets.values()) {
      for (const z of this.zombies.values()) {
        if (dist(b.x, b.y, z.x, z.y) < BULLET_RADIUS + ZOMBIE_RADIUS) {
          z.hp -= BULLET_DAMAGE;
          this.bullets.delete(b.id);
          if (z.hp <= 0) {
            this.zombies.delete(z.id);
            this.grantXp(b.ownerId, ZOMBIE_KILL_XP);
          }
          break; // this bullet is spent, stop checking it against other zombies
        }
      }
    }

    for (const z of this.zombies.values()) {
      if (now - z.lastHitPlayerAt < ZOMBIE_HIT_COOLDOWN_MS) continue;
      for (const p of this.players.values()) {
        if (!p.alive) continue;
        if (dist(z.x, z.y, p.x, p.y) < ZOMBIE_RADIUS + PLAYER_RADIUS) {
          p.hp = Math.max(0, p.hp - ZOMBIE_DAMAGE);
          z.lastHitPlayerAt = now;
          if (p.hp === 0) p.alive = false;
          break; // one hit per zombie per cooldown window
        }
      }
    }
  }

  private grantXp(playerId: string, amount: number): void {
    const p = this.players.get(playerId);
    if (!p || !p.alive) return;
    p.xp += amount;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level += 1;
      p.xpToNext = Math.floor(p.xpToNext * 1.3);
      p.maxHp += 8;
      p.hp = Math.min(p.maxHp, p.hp + 8);
    }
  }

  private tick(): void {
    if (this.zombies.size > 0) this.tickZombiesMovement();
    if (this.bullets.size > 0) this.tickBulletsMovement();
    this.resolveCollisions();

    if (this.sockets.size === 0) return;
    this.broadcastPlayers();
    if (this.zombies.size > 0) this.broadcastZombies();
    this.broadcastBullets();
  }
}
