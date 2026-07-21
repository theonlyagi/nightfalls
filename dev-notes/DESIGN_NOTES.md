# Design Notes

Running record of what's been built, the reasoning behind specific numbers,
and known rough edges — so future changes don't have to reverse-engineer the
"why" from the code alone. Ordered roughly by when each system landed.

## Rendering conventions (read this before touching any draw function)

- **Everything rotates relative to the entity's facing `angle`.** Any new
  visual feature (hair, teeth, decorations, weapon parts) must derive its
  position from `angle` (or `angle + Math.PI` for "behind"), never a
  hardcoded direction. This has been the single most common regression in
  this codebase — see the fixed bugs below for two real examples.
- **Structures store their placement `angle`** and render oriented to it.
  New wall/spike/turret art must follow the same `ang + Math.PI/2` rotation
  convention already used for wall/spike/shop bodies.
- Two confirmed-and-fixed rotation bugs, kept here as cautionary examples:
  the boss's mottled scar texture used to compute its angle from the loop
  index alone (`i*2.44 + i*i*0.7`) with no `angle` term, so it didn't rotate
  with the boss's facing; and the zombie/player mouth arcs used to be
  centered on the *perpendicular* axis instead of the facing axis, which
  rendered as a stray `)` parenthesis instead of a mouth curve.

## Economy: three separate currencies, on purpose

- **`points`** — earned per kill, the "shop currency." Spent at the Shop
  structure and on wall/turret/spike tier upgrades. Resets every run.
- **`statPoints`** ("upgrade points") — earned on level-up, spent on the
  mid-run HP/Speed/Power/Reload panel. Resets every run.
- **`metaPoints`** — earned on death (`wave*5 + kills + level*2`), spent
  between runs on permanent stat upgrades, one-time starting bonuses, and
  exclusive skins. Persists via `window.storage` (see the Persistence
  caveat in the main README — this API only exists in Claude's Artifacts
  runtime).

Keeping these three distinct was a deliberate choice after the Shop/tier
systems were built back-to-back — it would have been easy to let "points"
quietly become a catch-all currency, but the separation is what makes each
one feel like it's paying for a different kind of decision (in-run tactics
vs. character build vs. cross-run progression).

## Grid building system

- Tile size is `TILE = 64`, matching the pre-existing visual ground grid
  exactly, so the placement preview lines up with what players already see.
- `BUILD_REACH = TILE * 3` (192px) — max distance from the player a target
  cell can be. Chosen to feel like "a few steps away," not full-map reach.
- Targeting follows the **mouse's world position**, not a fixed distance in
  the facing direction — this was a deliberate change from the original
  freeform placement, specifically so players can place a tile beside or
  behind themselves instead of only ever straight ahead (confirmed with the
  user before implementing, since it's a real interaction-model change).
- New walls/spikes snap their angle to the nearest cardinal direction
  (`snapAngleToCardinal`) unless the player manually rotates with `R`
  (`manualBuildAngle`, cycles 90° per press, resets whenever the build
  selection changes). Turret/campfire/shop never use the manual override —
  `R` is gated to wall/spike only, matching the user's original ask.
- `getBuildTarget()` is the single source of truth for "what cell is
  targeted right now," used by both the live preview and the actual
  placement code, so the two can never disagree about what's about to
  happen. Any future change to targeting logic should go through this one
  function.

## Structure tiers (wall / turret / spike)

Three tiers each, upgraded in place with `points` (not `statPoints` — see
Economy above). Tier 0 numbers match the original `BUILD_DEFS` base stats;
tiers 1–2 costs were tuned to sit in the same 40–150 range as Shop items, so
upgrading a defense feels comparable in weight to a Shop purchase:

| | Tier 0 | Tier 1 | Tier 2 |
|---|---|---|---|
| Wall HP | 80 | 170 (40 pts) | 280 (90 pts) |
| Turret HP/dmg/range/rate | 70 / 9 / 270 / 1.6 | 110 / 14 / 310 / 2.0 (70 pts) | 160 / 20 / 350 / 2.5 (150 pts) |
| Spike HP/dmg | 40 / 9 | 65 / 16 (45 pts) | 95 / 26 (95 pts) |

Turrets track a live `aimAngle` (updated every frame toward the nearest
in-range zombie, independent of fire cooldown) so the barrel visibly leads
the target even between shots — this was the whole point of the "turret
should look at what it's shooting" request.

## Weapon choice (level 15) and mutation choice (level 25)

Both are one-time, permanent-for-the-run picks, triggered from `gainXp()`,
using the same non-blocking modal pattern as the Shop (game keeps running
underneath — consistent with how Shop already worked, not a new precedent).
`getBuildTarget`-style "single render function genericized over a `_DEFS`
record" pattern is reused for both choice panels.

Weapon stats (`WEAPON_DEFS`) were tuned so each has a genuinely different
feel rather than just different numbers on the same curve:
- **Dual Guns**: 1.5x fire rate, 0.65x damage, two parallel bullets from
  offset muzzles (not a spread cone — that's the Shotgun's job).
- **Machine Gun**: 2.3x fire rate, 0.9x damage, `moveSpeedMulWhileFiring:
  0.6` — the only weapon with a movement penalty, checked live via
  `mouse.down` in `weaponSpeedMul()`.
- **Shotgun**: 3-pellet spread cone (`spreadRad: 0.22`), shorter bullet
  life (`bulletLifeMul: 0.55`) so it's genuinely a close-range weapon, not
  just "shotgun but works at any range."
- **Grenade Launcher**: 0.35x fire rate, 2.6x damage, `explosive: true`.
  Explodes **only on zombie contact** (not on structures/resources/expiry)
  per the original spec — splash damage falls off linearly with distance
  (`1 - (d/radius)*0.4`, so even point-blank isn't a 100%-vs-0% cliff).

Mutation stats (`MUTATION_DEFS`) — Overclocked and Titan apply one-time
stat/size changes at selection (`player.radius *=`, `player.maxHp +=`)
rather than a continuous multiplier, since a mid-run body-size change reads
better as "you changed" rather than "your stats have a hidden modifier":
- **Vampire**: 2% lifesteal on player-dealt damage (both normal hits and
  grenade splash — checked in both `updateBullets` and `explodeBullet`),
  +25% speed, purple aura, two small fangs anchored to the mouth position.
- **Overclocked**: 1.5x fire rate, +35% size, and a genuine overheat
  mechanic — `OVERHEAT_PER_SHOT: 14`, decays at `25/sec` when not firing,
  hits `OVERHEAT_MAX: 100` and locks out firing for `2200ms`. Numbers were
  picked so a base-pistol player gets ~7 shots before overheating; pairing
  this with the Machine Gun weapon overheats in under a second, which reads
  as an intentional "extremely bursty but needs real management" combo
  rather than a balance oversight.
- **Titan**: +400 max HP, -15% speed, +100% size (radius doubled).
- **Pyromaniac**: 25% chance per hit to apply burn (`BURN_CHANCE: 0.25`),
  dealing 20% of that hit's damage per second for 5 seconds
  (`BURN_DAMAGE_FRACTION: 0.2`, `BURN_DURATION_MS: 5000`), ticked
  continuously in `updateZombies` rather than as discrete per-second ticks
  — smoother and avoids needing a separate tick-timer field on the zombie.
  Re-hitting a burning zombie refreshes the burn rather than stacking it,
  to avoid runaway DoT stacking.

## Minimap

"Base" has no standalone concept elsewhere in the game, so the minimap
marker is the **centroid of every structure the player has built** (walls,
spikes, turrets, campfires, shop), falling back to the world-center spawn
point only until the first structure goes down. This was a deliberate
change from an earlier "always show spawn point" version, at the user's
request, since a fixed spawn marker stops being useful the moment a player
builds their actual base somewhere else.

"Important events" (from the original ask) was interpreted as active
powerup pickups on the ground plus a night-time indicator on the map
border/label — the two concrete, already-tracked "time-sensitive" things in
the game, rather than something new invented for the minimap specifically.

## Known gaps / deliberately deferred

- No real backend — `window.storage` only exists in Claude's Artifacts
  runtime. Anyone deploying this for real needs to replace the whole
  meta-progression/leaderboard persistence layer.
- Multiplayer, biomes, and additional boss variety were discussed as
  lower-priority polish and never started.
- The Shop's cosmetic skins (bought with `points`, in-run) and the Meta
  panel's exclusive skins (bought with `metaPoints`, cross-run) are
  deliberately two separate systems, not merged — see Economy above for
  why. If this ever feels confusing in practice, that's the first place to
  reconsider, not a sign the code is wrong.
