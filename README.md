# NIGHTFALL.IO

A top-down, browser-based zombie survival game — think **zombs.io** base-building
crossed with **Call of Duty: Zombies** round structure and power-ups. Single
player right now, built with a real multiplayer path in mind later.

No build tools required to just play it: open `public/index.html` in a browser.
To develop, see **Getting Started** below.

---

## What's actually in this game

- **Top-down survival loop**: gather wood/stone from trees & rocks, build
  defenses, survive escalating zombie waves, level up mid-run stats.
- **Base building**: walls, spike traps, and auto-firing turrets each have 3
  upgrade tiers, upgraded in place (walk up, press `E`) by spending the
  "points" shop currency — not the level-up upgrade stat points. Turrets
  track and rotate their barrel toward whatever they're currently shooting.
  Also healing campfires and a Shop stall. Structures remember the facing
  angle they were placed at and render oriented that way.
- **Day/night cycle**: a smooth ~110s cycle: nights make zombies faster/harder
  and spawn extra roaming zombies even between waves.
- **Enemy variety**: normal / scout (fast, weak) / brute (slow, tanky) /
  spitter (ranged, kites the player) / exploder (rushes in, fused AoE blast) /
  boss (every 10th wave, much bigger, unique attack read).
- **Points economy + power-ups**: a "points" currency earned from kills,
  separate from the in-run upgrade stat points earned by leveling. Random
  power-up pickups (Nuke, Insta-Kill, Double Points, Full Heal) drop on kills,
  or spend points directly at a **Shop** structure (build it, walk up, press
  `E`) for the same powerups on demand, temporary combat boosts (speed/damage/
  fire rate/regen, 45s each), special items (structure repair, resource cache,
  a one-time "Second Chance" revive), and cosmetic skin tints — the only
  purchase that persists across runs within a session, since everything else
  in the run economy resets on death.
- **Meta-progression that survives death**: permanent stat upgrades, one-time
  starting bonuses, and exclusive skins bought with points earned across runs,
  persisted via the `window.storage` API (see **Persistence**, below —
  important caveat).
- **Shared leaderboard**: top 10 by wave/kills, also via `window.storage`.
- **3 class loadouts**: Gunner / Builder / Scavenger, picked before each run.
- **Weapon choice at level 15**: a one-time, permanent-for-the-run pick
  between Dual Guns (fast, mobile, lower damage per shot), Machine Gun (very
  high fire rate, slows you while firing), Shotgun (3-shot spread, close-range
  burst), and Grenade Launcher (slow-firing explosive splash damage). Each has
  its own hand-drawn silhouette on the player sprite.
- **Mutation choice at level 25**: a second permanent-for-the-run pick —
  Vampire (2% lifesteal, +25% speed, fanged/purple-aura look), Overclocked
  (+50% fire rate but the weapon overheats and locks out on sustained fire,
  +35% size), Titan (+400 HP, -15% speed, double size), or Pyromaniac (bullets
  have a chance to ignite enemies for damage over time, red aura).

## Tech stack

Deliberately minimal: **TypeScript, compiled to a single JS file, running on
a plain HTML5 `<canvas>`.** No frameworks, no bundler, no build step required
to play. This was a pragmatic choice for rapid iteration in a single-file
artifact context — see "History / How this project got here" for why, and
the Roadmap for what should probably change now that it's in Claude Code.

---

## Folder structure

```
nightfall-project/
├── README.md              — you are here
├── package.json            — npm scripts (build, watch, build:scripts, build:share, serve)
├── tsconfig.json            — compiles src/game.ts -> public/game.js (single file, no modules)
├── src/
│   └── game.ts              — THE ENTIRE GAME. ~2000 lines, one big IIFE. See "Code layout" below.
├── public/
│   ├── index.html            — page shell: HUD markup, start/death overlays, <canvas>
│   ├── styles.css             — all UI styling (HUD, panels, buttons)
│   └── game.js                — compiled output of src/game.ts (checked in so it runs with zero build step)
├── scripts/
│   ├── tsconfig.json         — separate config for this folder: compiles to CommonJS/Node, not DOM
│   ├── build-share.ts        — bundles public/* into one obfuscated HTML file (docs/)
│   └── build-share.js        — compiled output of build-share.ts (same checked-in-output pattern as game.js)
├── docs/
│   ├── index.html             — generated: the obfuscated single-file build. This is the GitHub
│   │                             Pages publish target (Settings → Pages → Deploy from branch →
│   │                             main → /docs) — Pages serves ONLY this folder, never src/,
│   │                             scripts/, or public/, so the source stays separate from what's live.
│   └── LICENSE.txt            — generated copy, sits alongside index.html for the published site
└── dev-notes/
    └── DESIGN_NOTES.md        — art direction decisions, what's done vs. in-progress, known issues
```

Everything under `src/` and `scripts/` is TypeScript — there's no hand-written
JS in this repo. `public/game.js` and `scripts/build-share.js` are both
generated files, checked in only so the game and the tooling can run with zero
build step for anyone who just wants to open/use them.

## Getting started

```bash
npm install          # installs typescript + @types/node (only devDependencies)
npm run build         # compiles src/game.ts -> public/game.js
npm run serve          # serves public/ at http://localhost:8080 (needs a server because
                        # window.storage-dependent code paths are guarded, but some browsers
                        # restrict canvas/file:// behavior — serving over http is safer)
```

Or just open `public/index.html` directly in a browser — it works over `file://`
too, since `public/game.js` is already committed/built.

**After editing `src/game.ts`, always run `npm run build`** (or `npm run watch`
while actively developing) — `public/game.js` is a generated file, not hand-edited.
Likewise, after editing `scripts/build-share.ts`, run `npm run build:scripts`
(or just `npm run build:share`, which does this for you) — `scripts/build-share.js`
is generated too.

To produce the published, obfuscated single-file build:

```bash
npm run build            # make sure public/game.js is current first
npm run build:share       # compiles scripts/build-share.ts, then runs it —
                           # writes docs/index.html + docs/LICENSE.txt
```

The embedded script in that output is minified and name-mangled (via `terser`) rather
than the readable `public/game.js` — a deterrent against casual view-source copying,
not real protection (client-side JS can always be deobfuscated by anyone determined
enough). `public/game.js` itself is left untouched for local dev/debugging.

`docs/index.html` is fully self-contained (same as `public/`, just obfuscated and
inlined into one file), so besides being the GitHub Pages source, it also works as
a standalone download — hand someone that one file and it runs with zero setup.

### Publishing to GitHub Pages

1. `npm run build:share` (do this after every change you want live).
2. Commit `docs/` and push.
3. Repo Settings → Pages → Source: **Deploy from a branch** → Branch: **main**, folder: **/docs**.
4. Pages serves whatever's in `docs/` at that URL — nothing else in the repo is published.

## Code layout (src/game.ts)

Everything lives in one IIFE. Rough sections, top to bottom:

1. **Type definitions** — interfaces for every entity (`Player`, `Zombie`,
   `Bullet`, `Structure`, `PowerUpEntity`, etc.) and the `Window.storage`
   ambient type augmentation.
2. **Setup** — canvas/context, input state, constants.
3. **Points & power-ups** — `POWERUP_DEFS`, `awardPoints`, `applyPowerup`.
4. **Meta-progression & leaderboard** — all `window.storage` reads/writes,
   `PERM_DEFS`, class loadouts.
5. **World & structures** — `BUILD_DEFS`, `WALL_TIERS`, world generation.
6. **Zombie types & spawning** — `ZTYPE`, `SKIN_VARIANTS`, `spawnZombie`.
7. **Update functions** — `updatePlayer`, `updateBullets`, `updateStructures`,
   `updateZombies`, `updateWaves`, `updateDayNight`.
8. **Render functions** — `drawBackground`, `drawResource`, `drawStructure`,
   `drawZombie`, `drawBossZombie`, `drawPlayer`, etc. **This is the section
   most recently under active rework — see dev-notes/DESIGN_NOTES.md.**
9. **Game loop & lifecycle** — `loop()` (wrapped in try/catch — see below),
   `resetGame()`, button wiring, `initMenu()`.

### A couple of things worth knowing before you touch this

- **`loop()` is wrapped in try/catch** and calls `showFatalError()` on any
  exception, which halts the game and shows a big red on-screen error message
  with the stack trace instead of silently freezing on a black canvas. This
  was added after a real "black screen, no errors visible" bug report — if
  you see that error box, screenshot it, it's diagnostic gold.
- **Structures store their placement `angle`** and render oriented to it —
  any new structure type needs to do the same or it'll render facing a fixed
  direction regardless of where the player was aiming.
- **Rotation bugs are the most common regression in this codebase.** Multiple
  past bugs were decorations (hair, eyebrows, a boss's spiked crown) drawn at
  fixed absolute angles instead of relative to the entity's facing `angle`.
  When adding any visual feature that should "face" a direction, always
  derive its position from `angle` (or `angle + Math.PI` for "behind"), never
  a hardcoded direction.
- **`window.storage`** (meta-progression + leaderboard) is an environment
  API injected by the Claude Artifacts runtime — it will not exist when
  running from a plain web server or in production. `hasStorage` guards
  this, but if you're deploying this for real, you need a real backend for
  persistence (see Roadmap).

## Persistence caveat (read this before deploying anywhere real)

Meta-progression and the leaderboard currently use `window.storage`, an API
that **only exists inside Claude's Artifacts runtime.** It is not a real
backend. If/when this ships anywhere else (a real domain, itch.io, etc.),
this entire persistence layer needs to be replaced with an actual server
(even something minimal — see Roadmap).

## Roadmap / where this was headed

**Real multiplayer is done and live** (server-authoritative Node/WebSockets
on `night-falls.xyz`) — this used to be item #1 here when it was just a
client-side lobby stub with no server at all; that's no longer accurate, so
it's dropped from the list below. What's still open on the multiplayer side
specifically, plus everything else discussed for future work, roughly
prioritized:

1. **Shop/resource sync (multiplayer)** — wood/stone/iron/points/powerups
   aren't server-tracked yet; costs aren't validated server-side either.
2. **Full zombie-type variety + structure Phase 2 combat (multiplayer)** —
   server still has one generic zombie archetype and flat per-level
   structure damage; the 9-type variety system and splash/chain-lightning/
   slow/crit mechanics from solo aren't ported. See `CLAUDE.md`.
3. **Downed-not-dead revive (multiplayer)** — a player at 0 HP goes down
   instead of dying; teammates can revive. Builds on the HP/`alive` sync
   already in `server/src/Room.ts`.
4. **Resource sharing/trading (multiplayer)** — teammates hand off wood/
   stone/points mid-run instead of four solo economies in one room.
5. **A real backend for accounts/leaderboard**, replacing `window.storage`
   (see the persistence caveat above).
6. **Relic/artifact system** — card-choice modal every few waves from a
   large pool of build-defining passive effects, reusing the existing
   level-15/25 choice-UI pattern.
7. **Elite/named zombies** — rare glowing mini-bosses on any wave, not
   gated to every-10th like the current boss.
8. **New creature types** — genuinely new enemy shapes/behaviors (zombie
   dogs, wall-climbing spiders), not just palette swaps.
9. **Bestiary/codex** — unlockable per-enemy entries that fill in as you
   encounter each type.
10. **Melee/secondary weapon slot** — an emergency close-range option
    alongside the primary gun.
11. **Base traps + automated resource gatherers** — expands the current 5
    structure types.
12. **Base-wide auras** — a structure/campfire upgrade buffing regen/damage
    in a radius.
13. **Achievements/challenges** — discrete goals granting meta points.
14. **Daily login rewards + daily quests** — cheapest-to-build, highest
    retention-value item on this list; do this early.
15. **Account level system** — persistent login-and-levels track separate
    from in-run player level; needs a scoping pass against the existing
    `metaPoints`/`PERM_DEFS` system first.
16. **Guild/clan system** — shared identity/leaderboard for a persistent
    group; real backend work, bigger scope than most items here.
17. **Battle pass** (free + paid tiers) — flagged as a monetization
    feature (real payment processing), scope separately from gameplay work.
18. **Difficulty selector** — pick at run start, both singleplayer and
    multiplayer, as a run-config input rather than a progression gate.
19. **Active companion** (wolf/drone that shoots and levels up) — confirmed
    paid feature, same monetization category as the battle pass.
20. **Dynamic weather, risk-reward loot crates, telegraphed megawaves,
    rotating unique bosses, start-of-run blessings, weekly leaderboard
    rewards** — smaller run-variety additions, each already scoped in
    `dev-notes/FEATURE_ROADMAP.md`.
21. Biomes/map variety, curse waves, daily seed challenge, physical "gold"
    pickup currency, auto-generated share cards — conditional or
    not-yet-decided; see `dev-notes/FEATURE_ROADMAP.md` for the trigger
    conditions and open questions on each.

See `dev-notes/FEATURE_ROADMAP.md` for the full decision record on every
item above (what's approved, what's conditional, what's explicitly
rejected, and the open scoping questions on each), and
`dev-notes/DESIGN_NOTES.md` for the full history of what's been tried, what
the current visual direction is, and exactly what's in-progress right now.
