# M3 — God-functions on the client

**Severity:** Medium
**Area:** complexity

## What's happening

Several client files are very large and contain single functions that braid
many concerns:

- `src/render/drawWorld.ts` — 1,249 lines
- `src/systems/update.ts` — 1,059 lines
- `src/ui/shopUI.ts` — 908 lines

The worst offender for maintainability is `updateBullets` in `update.ts`: one
loop handles player bullets, turret bullets, remote-player bullets, and zombie
bullets, plus resource harvesting and XP grants. This is exactly where the
sync bugs in C1/C2 hide — the net-mode and solo-mode paths are interleaved in
the same giant function.

## Why it matters

Large multi-concern functions are hard to reason about and are where subtle
mode-specific bugs (solo vs net) slip in unnoticed.

## Suggested direction

Split `updateBullets` by owner/concern (player-bullet handling, resource
harvest, net-mode vs solo-mode paths) into named helpers. Same for the biggest
draw/shop routines. Purely structural; no behavior change intended.
