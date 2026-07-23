# Maintainability issues

A prioritized maintainability review of the codebase (`src/` client + `server/src/`).
Each issue is its own file so they can be picked up, discussed, or closed
independently. Findings were traced by reading the current `main`/branch state —
where something is inferred from static reading rather than reproduced live,
the file says so.

**Nothing here has been changed in code.** These are notes for the team to
triage, not applied fixes.

## Critical

- [C1 — Dual authority: client and server both run full combat in net mode](C1-dual-authority-net-combat.md)
- [C2 — Remote-player bullets double-spawned and mis-attributed](C2-remote-bullet-double-spawn.md)
- [C3 — Day/night simulated locally AND from server, unclear winner](C3-daynight-double-sim.md)
- [C4 — Process risk: no CI, built artifacts committed, direct-to-main merges](C4-process-ci-artifacts.md)

## Medium

- [M1 — Client/server duplicate constants with no shared module](M1-duplicated-constants.md)
- [M2 — `Room.ts` is an 863-line god class](M2-room-god-class.md)
- [M3 — God-functions on the client (drawWorld / update / shopUI)](M3-client-god-functions.md)
- [M4 — RemotePlayer models position three times](M4-remoteplayer-triple-position.md)
- [M5 — Scattered magic numbers, some client/server mismatched](M5-magic-numbers-mismatch.md)
- [M6 — Type-safety escapes (`as any`, untyped weapon field)](M6-type-safety-escapes.md)

## Nice-to-have

- [N1 — Assorted smaller cleanups](N1-nice-to-haves.md)

## Suggested first three

1. **C1/C2/C3 together** — decide a single authority for in-match combat and
   make the client a pure predictor/renderer. This dissolves all three at once.
2. **C4** — stop committing built artifacts and add minimal CI (typecheck +
   build) so a stale-checkout rewrite can't silently clobber merged work again.
3. **M1** — extract a shared client/server constants module.
