# C3 — Day/night simulated locally AND from server, unclear winner

**Severity:** Critical
**Area:** multiplayer sync

## What's happening

`updateDayNight(dt)` runs **unconditionally** every frame
(`src/game.ts:96`), so in a net match:

- The client advances its own day/night clock locally, and its night-spawn
  branch pushes phantom local zombies into the array — which are then wiped
  by the next server zombie snapshot (a one-frame flicker).
- Meanwhile the server's `net.onDayNight` handler only sets
  `time`/`nightCount`/`bloodMoon`, **not `factor` or `isNight`**
  (`src/net/matchSync.ts:330-339`), and only nudges `time` when drift exceeds
  400ms.

## Why it matters

Two clocks race, and it's genuinely ambiguous which is authoritative at any
given moment. `factor`/`isNight` (which drive the visual overlay and the
"is it night" gameplay checks) are computed by the local sim, while
`nightCount`/`bloodMoon` come from the server — so the day/night *visual* and
the day/night *state* can disagree, and two clients can drift out of phase.

## Suggested direction

Same root as C1: make the server authoritative and the client a renderer.
The server already sends `time`/`nightCount`/`bloodMoon`; the client should
derive `factor`/`isNight` from the server's `time` (or have the server send
them) and **not** run its own `updateDayNight` sim while `inNetMatch`. Gating
`updateDayNight`/`updateBloodMoon` behind `!inNetMatch` (alongside the other
already-gated systems) also removes the phantom-zombie flicker.
