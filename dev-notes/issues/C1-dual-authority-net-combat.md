# C1 — Dual authority: client and server both run full combat in net mode

**Status:** 🔄 IN PROGRESS — first step landed (`59f8f63`), see below for what's left
**Severity:** Critical
**Area:** multiplayer sync / architecture

## Progress so far

A full combat-authority audit was done (trace of client vs. server bullet
creation/collision/damage, kill/XP/reward granting, structure combat, and a
state-source table) before picking a first step deliberately small enough not
to require rewriting combat.

**Landed:** `toClientZombie()` (`src/net/matchSync.ts`) previously preferred
the client's own locally-simulated zombie `hp` unless the server's snapshot
was lower or the zombie was mid-flash. Since client and server compute
damage with different formulas (client models armor/vulnerability/burn/
vampire; server applies flat generic damage, no armor model at all), that
merge didn't converge to one truth — it picked whichever number was lower.
Changed so `curHp` is always `snap.hp`, unconditionally. This makes the
server the single source of truth for what the player *sees* as zombie HP,
without touching bullet handling, collision logic, interpolation, packet
formats, or any server code.

**Still open — this is what's left, in the order the audit recommends:**

1. `src/systems/update.ts`'s `explodeBullet()` calls `zombieDied(z)` without
   threading `b.owner` through (no second argument, defaults `isMyKill=true`)
   — a remote player's *explosive* kill still grants the local player kill
   credit/points/gold/drops. The direct-hit path already does this correctly
   (`zombieDied(z, b.owner === 'player')`); the splash path doesn't. Cheapest
   remaining fix, no architecture change needed.
2. `net.onPlayers` (`src/net/matchSync.ts`) still only copies `hp`/`maxHp`/
   `alive` from the server — never `xp`/`level`/`xpToNext`, even though
   they're already in `NetPlayerSnapshot`. Client and server XP/level counters
   run completely independently and will diverge; anything gated on level
   (weapon choice at 15, mutation at 25) fires off the wrong count.
3. The bigger remaining piece: `updateBullets()`/`explodeBullet()`
   (`src/systems/update.ts`) still fully compute their own damage against the
   local `zombies` array every frame in net mode — this is now cosmetically
   inert (step 1 above means the result never reaches the screen) but still
   duplicated work, and the underlying reason C1 exists at all. A full fix
   means picking a single authority (recommended: server) and either porting
   armor/vulnerability/weapon-aware damage to the server, or making the
   client a pure predictor that stops computing zombie damage locally.
4. Resource-harvest rewards (wood/stone/iron/gold/XP from hitting resources,
   `update.ts:373-427`) are granted entirely client-side and never validated
   by the server — `handleHitResource` only tracks HP/existence, no reward.

## Original audit (bullet/combat authority trace)

## What's happening

In a net match the client still runs its own full, authoritative-style
simulation on top of the server's:

- `updateBullets(dt)` runs **unconditionally** every frame
  (`src/game.ts:87`) — it moves client bullets, collides them with synced
  zombies, harvests resources, applies vampire lifesteal, and calls
  `gainXp`/`zombieDied` locally (`src/systems/update.ts:359-366`).
- The server independently does all the same combat and is the real
  authority (`server/src/Room.ts:651-710`).

The two are stitched together only by ad-hoc reconciliation:

- Zombie HP takes "whichever is lower" between local and snapshot
  (`src/net/matchSync.ts:123-131`).
- `net.onPlayers` copies only `hp/maxHp/alive` from the server —
  **not `xp`/`level`** (`src/net/matchSync.ts:236-240`).

## Why it matters

Client level and server level count kills independently and will diverge.
Anything gated on level (weapon choice at 15, mutation at 25) fires off the
*client's* local count, which does not match the server's authoritative one.
More broadly, this is a "two simulations pretending to be one" design — it's
the single biggest source of current and future sync bugs (C2 and C3 are both
symptoms of the same root shape).

## Suggested direction

Pick one authority (the server) and make the client a pure predictor +
renderer: local prediction for responsiveness, but the server snapshot is the
source of truth for zombie HP, kills, XP, and level. Concretely, that means
the client should stop granting XP / killing zombies / applying lifesteal from
its own bullet loop in net mode, and `onPlayers` should apply the server's
`xp`/`level`/`xpToNext`.

Resolving this cleanly also resolves C2 and C3, so it's worth tackling as one
design pass rather than three patches.
