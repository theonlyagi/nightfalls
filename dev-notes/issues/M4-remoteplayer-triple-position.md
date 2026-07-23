# M4 — RemotePlayer models position three times

**Severity:** Medium
**Area:** state modeling / correctness footgun

## What's happening

The `RemotePlayer` interface carries three parallel copies of position
(`src/state.ts:30-36`):

- `x` / `y` / `angle`
- `renderX` / `renderY` / `renderAngle`
- `targetX` / `targetY` / `targetAngle`

Only some are consistently used, and `angle` is mutated to equal `renderAngle`
inside the interpolation loop (`src/net/matchSync.ts:106`).

## Why it matters

With three copies of the same conceptual value and no clear rule for which is
canonical, it's easy to read a stale one — e.g. revive targeting reads
`renderX ?? x` (`src/systems/update.ts:224`), while other code reads plain
`x`. This is a correctness footgun, not just untidiness.

## Suggested direction

Collapse to two clearly-named concepts: the authoritative server value
(`target`) and the smoothed on-screen value (`render`). Drop the ambiguous
bare `x`/`y`/`angle`, or make them an explicit alias of one of the two with a
documented meaning.
