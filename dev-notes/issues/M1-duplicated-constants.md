# M1 — Client/server duplicate constants with no shared module

**Severity:** Medium
**Area:** DRY / client-server drift

## What's happening

The server keeps hand-copied duplicates of values the client also defines,
with no shared source:

- `WORLD_W`/`WORLD_H`, `ZOMBIE_RADIUS`, structure defs, tower tables — all
  re-declared in `server/src/protocol.ts` (intentionally, per its own doc
  comment, because the server is a standalone project that doesn't import
  from `src/`).
- The day/night cycle length is a bare magic number `110000` at
  `server/src/Room.ts:775`, vs the client's `dayNight.total` at
  `src/state.ts:65`.
- Resource spawn counts `140 / 70 / 45` are hardcoded in **three** places:
  `src/systems/wave.ts:24-40`, `server/src/Room.ts:222-242` (world gen), and
  `server/src/Room.ts:803-830` (daybreak respawn).

## Why it matters

Any balance tweak on one side silently fails to reach the other. CLAUDE.md
already records this drift biting the project once (the `BUILD_REACH`
rescale). Every duplicated constant is a latent client/server desync waiting
for someone to edit only one copy.

## Suggested direction

Extract a shared constants module both sides import (a small package, a
symlinked/copied `shared/` dir built into both, or codegen). At minimum,
de-duplicate the resource counts and the day/night cycle length so there's a
single definition per value.
