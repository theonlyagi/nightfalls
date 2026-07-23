# C1 — Dual authority: client and server both run full combat in net mode

**Severity:** Critical
**Area:** multiplayer sync / architecture

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
