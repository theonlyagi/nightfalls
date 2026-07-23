# C3 — Day/night simulated locally AND from server, unclear winner

**Status:** ✅ RESOLVED (`4ad7c07`)
**Severity:** Critical
**Area:** multiplayer sync

## Resolution

- `server/src/Room.ts` now includes `isNight: this.isNight` in the existing
  per-tick day/night broadcast (it was already computed and stable, just
  never sent).
- `src/net/socket.ts`'s `NetDayNightMessage` gained the matching `isNight`
  field.
- `src/systems/wave.ts`: extracted `fireDayNightTransitionBanner(wasNight)`
  and `applyPhaseLabel()` out of solo's `updateDayNight()` into reusable
  exported helpers. Solo behavior is unchanged — same values computed in the
  same order, just via named functions instead of inline code.
- `src/net/matchSync.ts`: `net.onDayNight` now applies the server's
  `isNight` directly, derives `factor` as a pure function of the
  already-synced `time`, and calls the two extracted helpers — so banners
  and the HUD label fire identically to solo, driven by server state.
- `src/game.ts`: `updateBloodMoon()`/`updateDayNight(dt)` now only run when
  `!inNetMatch` — the one asymmetry (every other per-match system was
  already gated this way) that let the dual simulation happen. This also
  resolved the phantom-zombie night-spawn flicker as a side effect.

Verified beyond just compiling: an in-process test drove the server's real
`updateDayNight()` through 2,421 ticks (~2.2 full day/night cycles) and
confirmed the broadcast `isNight` field changes exactly 4 times (matching
the expected transitions), with stable runs up to 550 ticks between them —
proving the client's transition-banner guard can't re-fire on every network
tick.

## Original report

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
