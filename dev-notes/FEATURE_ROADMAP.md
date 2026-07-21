# Feature Roadmap — future ideas, prioritized by decision

Brainstormed to solve one problem: **runs start feeling the same too quickly,
and there's not enough reason to come back tomorrow.** Not implemented yet —
this is a decision record so a future session doesn't have to re-litigate
"should we build this" from scratch. Status reflects the user's actual
choices, not just raw ideas. Art direction is explicitly out of scope here
(separate artist) — everything below is systems/gameplay.

## Approved — build these when scheduling allows

- **Relic/artifact system.** Card-choice modal offered every few waves
  (reuses the existing level-15-weapon-choice / level-25-mutation-choice UI
  pattern), pulling from a large pool (30-50+) of qualitative passive
  effects — not linear stat bumps like the existing upgrade panel. The goal
  is build-defining combinations (a fire build plays differently from a
  turret-spam build) so runs stop feeling interchangeable. Needs its own
  data-driven definition table (`RELIC_DEFS`) similar to `WEAPON_DEFS` /
  `MUTATION_DEFS` in `src/constants.ts`.

- **Elite/named zombies.** Rare glowing mini-bosses that can spawn on *any*
  wave (not gated to every-10th like the current boss), with a small unique
  drop. More frequent "oh, interesting" moments than the current fixed boss
  cadence.

- **New creature types.** Not just palette-swapped zombies — genuinely new
  enemy shapes/behaviors: zombie dogs (fast, low HP, pack-spawn), zombie
  spiders (wall-climbing / ranged web?), etc. Ties directly into the
  bestiary idea below — new creatures are what make a codex worth having.

- **Bestiary/codex.** Unlockable per-enemy entries (stats, lore, first-kill
  date) that fill in as you encounter each type. Rewards experimentation
  and gives the new creature types above a place to "land" in the UI.

- **Melee/secondary weapon slot.** An emergency close-range option
  alongside the primary gun, so positioning stays dynamic instead of pure
  kiting.

- **Base traps + automated resource gatherers.** Expands the current 5
  structure types (wall/spike/turret/campfire/shop) — spike pits, tesla
  coils, and passive gatherers reward base-layout investment beyond "spam
  turrets."

- **Base-wide auras.** A structure (or campfire upgrade) that buffs
  regen/damage in a radius — makes *where* you build a real decision, not
  just *what*.

- **Achievements/challenges.** Discrete goals ("kill 50 with fire," "reach
  wave 20 without placing a wall") granting meta points — gives players
  goals besides "go further than last time."

- **Downed-not-dead revive (multiplayer).** A player at 0 HP goes down
  instead of dying outright; teammates can revive them. Adds real co-op
  tension without ending the run for the whole party. Depends on the
  player-death/HP sync already built server-side in `server/src/Room.ts` —
  extending `alive` into a `downed` state is a natural next step there.

- **Daily login rewards + daily quests.** Cheapest-to-build, highest
  retention-value item on this whole list. Plugs directly into the existing
  points/skins economy — no new currency needed. **Do this early**, not
  last, given the "yes yes yes yes" energy.

## Approved, with the user's own refinement

- **Account level system** (was "prestige system"). Reframed by the user as
  a persistent **login-and-levels** system rather than a reset-for-bonus
  prestige loop — an account-level track separate from in-run player level,
  presumably with its own reward tiers. Overlaps with the existing
  `metaPoints`/permanent-perk system (`src/constants.ts` `PERM_DEFS`) —
  needs a scoping pass to decide whether this *replaces* or *sits alongside*
  meta points before building. Pairs naturally with daily login above.

- **Guild/clan system** (was generic "party/clan meta"). User specifically
  wants guilds — shared identity/leaderboard for a persistent group, not
  just solo stats. This is a real backend feature (guild data, membership,
  invites) — meaningfully bigger scope than most items on this list, likely
  wants its own dedicated planning pass once the core multiplayer server
  work (rooms, sync — see main `CLAUDE.md`) is further along.

- **Battle pass, free + paid tiers.** User wants both a free track and a
  paid track. **Flag: this is a monetization feature, not just a gameplay
  one** — a paid tier means real payment processing (Stripe or similar),
  which is a meaningfully different kind of work (compliance, security,
  refunds/chargebacks) from anything built so far. Scope this as its own
  project when it comes up, don't fold it silently into a gameplay sprint.
  The active companion (Round 2, below) is also confirmed paid — worth
  scoping both together as one payments/monetization project rather than
  building payment processing twice.

- **Difficulty selector, both modes.** User clarified this should be a
  difficulty pick available at run start in *both* singleplayer and
  multiplayer — not a post-completion New Game+ unlock. Simpler to build
  than originally framed; just needs difficulty to be a run-config input
  (spawn rate / zombie stat multipliers) rather than a progression gate.

## Conditional — revisit when the trigger condition is met

- **Curse waves** (optional-modifier waves like "no building this wave" for
  bonus reward). User's call: build this **if/when a separate, harder game
  mode gets added** — curse waves would fit naturally as that mode's
  content rather than being sprinkled into the base survival mode. Worth
  connecting this to the difficulty-selector item above when that
  conversation happens — a "Hard Mode" could literally be curse-wave-heavy.

- **Biome/map variety** (alternate environments — forest/snow/urban ruins).
  User's call: **later, once the game is less purely wave-survival across
  different modes** — i.e. once there's enough mode variety that different
  environments have somewhere meaningful to attach to, rather than being
  reskins of the one existing map.

## Explained, not yet decided

- **Daily seed challenge.** Everyone plays the same fixed RNG seed on a
  given day, with its own daily-resetting leaderboard (fairer comparison
  than the endless leaderboard, where spawn luck matters). Requires the
  game's RNG to be swappable to a seeded source for a run — the client
  doesn't have this today. Pairs well with the daily-quest system above
  ("play today's challenge" is an obvious daily quest). No explicit
  go/no-go from the user yet beyond the explanation above — confirm before
  scheduling.

## Rejected

- **Environmental hazards** (spreading fire, explosive barrels, luring
  zombies into traps). User said no — don't revisit unless they bring it
  back up themselves.

---

# Round 2 — 10 more ideas

Same brainstorm goal as above (run variety + retention), a second pass after
the user worked through the first list.

## Approved — build these when scheduling allows

- **Active companion (wolf or drone).** Not a passive-buff pet — user
  specifically wants it to **shoot on its own and level up**. **Confirmed:
  this is a premium paid feature**, not free — same monetization category as
  the battle pass below (real payment processing, not just a gameplay
  toggle). Needs a scoping decision before building: does the companion's
  level reset every run (tied to the in-run player level, like a summoned
  pet), or is it a persistent meta-progression track that carries between
  runs (more like an account-level pet)? Either is buildable, but they're
  different systems — don't start building until this is picked. Since it's
  paid, also needs: what exactly is being sold (the companion itself?
  companion slots? cosmetic skins for it, with the companion mechanic
  itself free?) — worth deciding alongside the battle pass monetization
  pass rather than as a one-off.

- **Dynamic weather** (fog reduces visibility, rain slows zombies *and* the
  player, thunderstorms can strike zombies with lightning). Adds
  moment-to-moment variety within a single run, distinct from the
  run-to-run variety the relic system targets.

- **Risk-reward loot crates.** Locked crates that require standing still to
  channel-open while zombies keep coming, containing rare relics/cosmetics.

- **Telegraphed megawave events.** A rare, warned-in-advance horde flooding
  from one direction — different tactical shape from steady wave spawning
  or Blood Moon, forces a chokepoint-defense strategy.

- **Resource sharing/trading (multiplayer).** Teammates can hand off
  wood/stone/points mid-run — pushes toward actual cooperation on economy
  instead of four solo economies in one room.

- **Start-of-run blessings.** Pick 1 of 3 randomized modifiers *before* a
  run starts (e.g. "zombies 20% faster but drop 50% more loot") — lets
  players opt into their own risk/reward shape upfront, distinct from the
  mid-run relic system (which is about build variety, not difficulty
  shaping).

- **Rotating unique bosses.** A pool of distinct bosses with different
  attack patterns, randomly picked each boss wave, instead of one boss
  archetype that just scales with wave number.

- **Auto-generated end-of-run share card.** A shareable summary image (wave
  reached, kills, notable build) generated at death. Zero gameplay risk,
  pure growth/virality loop.

## Approved, with the user's own idea/refinement

- **Weekly leaderboard rewards.** This replaces the original "community-wide
  shared goal" pitch — the user redirected toward an individual competitive
  reward instead of a shared communal target. Top rank(s) on a
  weekly-resetting leaderboard get some kind of reward. Not yet decided:
  reward tier cutoff (#1 only? top 10? top 100?) and what it actually grants
  (points, an exclusive cosmetic, a title) — needs a follow-up decision
  before building.

- **Physical pickup currency ("gold").** User-proposed, not from the
  original 10: a currency that drops in the world (from zombies/crates) and
  must be walked over to collect, instead of being instantly credited like
  the existing `points`/`wood`/`stone` system. Adds a real "do I break
  formation to grab this" decision to combat. **Needs a scoping pass before
  building**: is this a 4th currency alongside the existing three, or does
  it fold into one of them (most likely candidate: `points`, since that's
  already the in-run Shop currency)? Read the "Economy: three separate
  currencies, on purpose" section in `dev-notes/DESIGN_NOTES.md` before
  deciding — adding a fourth on top of that deliberate three-currency
  design should be a conscious choice, not a default.

## Rejected

- **Rescuable survivor NPCs.** User said no.
