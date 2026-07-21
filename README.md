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

Rough priority order discussed during development, highest-impact first:

1. **Real multiplayer** — server-authoritative (Node + WebSockets), the
   single biggest unlock for making this an actual "io game" instead of a
   single-player prototype with a leaderboard bolted on. Also the only real
   fix for the persistence caveat above, and for protecting game logic
   client-side code can always be viewed/copied by definition.

   The **client side of this is scaffolded**: the start screen has a Game
   Mode picker (Singleplayer / Team Mode), and picking Team Mode leads to a
   lobby screen (up to 4 players, ready-up, auto-starts once everyone's
   ready). All of it currently runs against a local-only stub — the `lobby`
   object in `src/game.ts` (search `Team lobby (local stub`) — that only
   ever has the local player in it. There is still no server; this game
   is a static site on GitHub Pages, which can't hold live connections.

   To make Team Mode real, a server needs to expose join/setReady/leave over
   a WebSocket and push roster + match-start events back down — the lobby UI
   and ready-up flow are already written against exactly that shape
   (`lobby.players`, `lobby.onPlayersChanged`, `lobby.onMatchStart`), so
   wiring in a real client means replacing the stub's internals, not the UI.
   That server also needs somewhere to actually run, unlike GitHub Pages —
   e.g. Fly.io or Render's free tier are reasonable starting points for a
   small Node/WebSocket process. Once players can join a real shared
   session, the harder remaining piece is everything *inside* a match:
   syncing zombie waves, structures, and hit detection across clients — the
   lobby only gets everyone to the same starting line.
2. **A real backend for accounts/leaderboard** once multiplayer exists.
3. Biomes, more boss variety, more events — lower priority polish.

See `dev-notes/DESIGN_NOTES.md` for the full history of what's been tried, what
the current visual direction is, and exactly what's in-progress right now.
