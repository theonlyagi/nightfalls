# M5 — Scattered magic numbers, some client/server mismatched

**Severity:** Medium
**Area:** balance tunables / client-server drift

## What's happening

Gameplay tunables are inline magic numbers spread across client and server,
and at least one pair is actually mismatched:

- **Revive range: 180 on the client** (`src/systems/update.ts:220`) vs
  **140 on the server** (`server/src/Room.ts:453`). You can start charging a
  revive at 180px and hold the full 5 seconds, only for the server to reject
  it as out of range.
- Other inline values: player regen `0.12`/tick (`server/src/Room.ts:577`),
  revive hold duration `5000`ms, wolf pack sizes, zombie spawn distances,
  night zombie counts (`12 + nightCount * 6`).

## Why it matters

Balance changes require hunting through logic for buried literals, and
client/server pairs like the revive range drift apart silently — producing
confusing "it looked like it should work" behavior for players.

## Suggested direction

Centralize gameplay tunables (ideally in the shared module from M1 so both
sides read the same value), and reconcile the revive-range mismatch to a
single number.
