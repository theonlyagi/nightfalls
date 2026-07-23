# N1 — Assorted smaller cleanups

**Severity:** Nice-to-have
**Area:** misc

Low-priority items, grouped since none is big on its own:

- **State-module boilerplate.** `src/state.ts` has ~40 hand-written
  `export let x` / `export function setX` pairs. The mutable module-global
  singletons also make anything that touches state effectively untestable.

- **No test suite.** Verification currently relies on throwaway scripts. The
  pure-math pieces (day/night cosine curve, XP curve, collision distance)
  are trivially unit-testable and would have caught the C4 regression.

- **`console.*` left in the server** (~10 calls in `server/src/`). Fine for
  now; a leveled logger would help once this is a real long-running service.

- **Repetitive `try/catch showFatalError`.** Nearly every `onclick` in
  `src/game.ts` is individually wrapped in the same try/catch. A single
  delegated handler would remove the repetition.

- **Input coupling.** `mouse.down` drives both shooting and revive-charging,
  so `tryShoot` has to special-case `reviveHoldingTargetId` to avoid firing
  while reviving (`src/systems/combat.ts:147`). Works, but the two behaviors
  are entangled through one input flag.

- **Vestigial fields.** `bloodMoon.endsAt` / `bloodMoon.nextAt` and
  `dayNight.nightSpawnTimer` linger in the interfaces but are effectively
  dead under the current trigger model.
