# Maintainability issues

A prioritized maintainability review of the codebase (`src/` client + `server/src/`).
Each issue is its own file so they can be picked up, discussed, or closed
independently. Findings were traced by reading the current `main`/branch state —
where something is inferred from static reading rather than reproduced live,
the file says so.

**Nothing here has been changed in code.** These are notes for the team to
triage, not applied fixes.

## Critical

- 🔄 [C1 — Dual authority: client and server both run full combat in net mode](C1-dual-authority-net-combat.md) — **in progress, first step landed (`59f8f63`) — see the file for exactly what's left**
- ✅ [C2 — Remote-player bullets double-spawned and mis-attributed](C2-remote-bullet-double-spawn.md) — resolved (`96c710e`)
- ✅ [C3 — Day/night simulated locally AND from server, unclear winner](C3-daynight-double-sim.md) — resolved (`4ad7c07`)
- ⬜ [C4 — Process risk: no CI, built artifacts committed, direct-to-main merges](C4-process-ci-artifacts.md) — not started

## Medium

- ⬜ [M1 — Client/server duplicate constants with no shared module](M1-duplicated-constants.md) — not started
- ⬜ [M2 — `Room.ts` is an 863-line god class](M2-room-god-class.md) — not started
- ⬜ [M3 — God-functions on the client (drawWorld / update / shopUI)](M3-client-god-functions.md) — not started
- ⬜ [M4 — RemotePlayer models position three times](M4-remoteplayer-triple-position.md) — not started
- ⬜ [M5 — Scattered magic numbers, some client/server mismatched](M5-magic-numbers-mismatch.md) — not started
- ⬜ [M6 — Type-safety escapes (`as any`, untyped weapon field)](M6-type-safety-escapes.md) — not started

## Nice-to-have

- ⬜ [N1 — Assorted smaller cleanups](N1-nice-to-haves.md) — not started

## Status recap (as of this session)

C2 and C3 are resolved and pushed. C1 has its first step landed — the
remaining work is spelled out in `C1-dual-authority-net-combat.md`'s
"Still open" list, in the order the audit recommends tackling it. C4 and all
Medium/Nice-to-have items are unchanged from the original review — not
started, still accurate as written.

## Suggested next three

1. **C1's remaining steps** (see the file) — the `explodeBullet` ownership
   gap and the XP/level sync are both small and don't require an
   architecture decision; the full damage-authority migration is bigger.
2. **C4** — stop committing built artifacts and add minimal CI (typecheck +
   build) so a stale-checkout rewrite can't silently clobber merged work again.
3. **M1** — extract a shared client/server constants module.
