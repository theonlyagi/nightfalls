# NIGHTFALL.IO — session handoff / project memory

This file is for a fresh Claude Code session picking up this project. For
general project docs (architecture, folder layout, code layout, roadmap) see
[README.md](README.md). This file covers **what's changed recently and what's
still outstanding** — the stuff a new session wouldn't otherwise know.

## Repo / deployment facts

- GitHub repo: `theonlyagi/nightfalls` (private).
- GitHub Pages serves **`docs/index.html`** only (Settings → Pages → Deploy
  from branch → `main` → `/docs`), so the published site is always the
  obfuscated single-file bundle, never source.
- Live site: `https://theonlyagi.github.io/nightfalls/`
- **This is not a git repo locally as of last check** (`git` metadata wasn't
  detected) — verify with `git status` before assuming any prior commits
  exist locally. If it isn't initialized, the existing GitHub repo still has
  whatever was last force-pushed; don't `git init` + push without first
  checking `gh repo view theonlyagi/nightfalls` and reconciling.
- Debug/cheat console: press **Home** in-game, password **`agi123`**. It's a
  local testing tool, not a real security gate (says so on the panel itself).

## ⚠️ Outstanding: nothing has been pushed to GitHub yet

Four feature batches were built, compiled, and verified locally/in the
obfuscated build this session, but **never committed or pushed**. The live
site currently only reflects whatever was in the original force-push
(grid background, no lobby, no settings, possibly old zombie art). Unlanded
locally:

1. Grass background (replaced the grid)
2. Menu background image (main menu screen)
3. Team Mode / lobby UI (local-only stub, see Roadmap in README)
4. UI polish + Settings screen (most recent work)

**Do not push without asking first** — every push in this project has
required explicit user confirmation. When the user is ready, the flow is:
`npm run build && npm run build:share` → commit `docs/` (and source) → push
→ confirm Pages picks it up.

## What shipped this session (chronological)

1. **Debug console** (Home key, password `agi123`) — set level/wave/points,
   full heal, god mode, trigger Blood Moon, add fake lobby player.
2. **Single-file shareable build** — `npm run build:share` bundles
   `public/` into `docs/index.html`, minified+mangled via `terser`. Also a
   manually-refreshed desktop copy at
   `C:\Users\ethan\OneDrive\Desktop\nightfall-io.html`.
3. **Converted all tooling to TypeScript** — `scripts/build-share.ts` (was
   hand-written JS), compiled via its own `scripts/tsconfig.json`.
4. **Speed upgrade fix** — `accel` was a fixed constant instead of being
   derived from live `maxSpeed`, so speed upgrades were mathematically inert.
   Now computed fresh each frame from `maxSpd`.
5. **Powerup lifetime** — powerups expire after 20s (`POWERUP_LIFETIME_MS`)
   with a flicker warning in the last 3s, so they don't pile up and lag.
6. **Build-bar no longer auto-selects** the shop on load.
7. **Blood Moon event** — random 1–30 min interval, 60s duration, 5x zombie
   spawn rate, zombies 30% stronger, red overlay/flashlight instead of the
   normal night tint. Debug-triggerable.
8. **Zombie redesign** — regular zombies (and the general style for other
   types) now use a body + two arm-blob spheres on a visible rounded
   connector, matching a user-provided reference image. (First pass was
   rejected as invisible/subtle — connector color/size were fixed to be
   clearly visible.)
9. **Obfuscated publishing pipeline** — `docs/index.html` is the minified,
   name-mangled, license-commented distributable; `public/` stays readable
   for dev. Fixed a nasty bug where `String.replace` with a **string**
   replacement corrupted the bundle whenever the source JS contained a
   literal `$'`-like sequence — now uses replacer **functions** throughout
   `scripts/build-share.ts`.
10. **GitHub Pages setup** — reconciled with the pre-existing
    `theonlyagi/nightfalls` repo (rescued one unique asset — a reference
    webp — from the stale remote before force-pushing), set repo
    public + Pages from `/docs`.
11. **Grass background** — replaced the grid entirely with a procedural
    grass texture (base fill + tuft clusters), brightness blended between
    day/night tones via `mixHex()`.
12. **Menu background image** — `public/menu-bg.jpg` (dark teal
    faceted crystal/leaf art) as the literal background for the start
    screen (and now also the lobby/settings overlays, for visual
    consistency).
13. **Game modes: Singleplayer / Team Mode** — mode picker on the start
    screen; Team Mode opens a **lobby UI** (up to 4 players, ready-up,
    auto-starts once 2–4 are ready). **This is UI/layout only** — the
    `lobby` object in `src/game.ts` is a local-only stub (search `Team
    lobby (local stub`); there's no real server. See README Roadmap for
    what a real backend integration needs.
14. **UI polish + Settings screen** (most recent):
    - Shared design-system pass across every panel/card/button in
      `public/styles.css`: glass/backdrop-blur, consistent hover
      lift+glow, smoother fade+scale transitions on all overlays
      (`.overlay-anim`), animated bar fills.
    - New **Settings screen** (`#settingsOverlay`): Screen Shake toggle,
      Damage Numbers toggle, UI Scale (small/medium/large). Persisted via
      `localStorage` (`nightfall_settings` — first use of `localStorage`
      in this project; everything else meta-progression-related uses the
      Claude-Artifacts-only `window.storage`, which doesn't work in a real
      deploy).
    - Reachable via gear icon buttons on the start screen and mid-run HUD.
      Opening it mid-run genuinely **pauses** the game loop (`paused` flag
      in `loop()`) rather than just overlaying UI on top of a running game.
    - Audio settings were explicitly **out of scope** (no sound system
      exists in the game at all yet).

## Known environment quirks (only relevant if testing in this Browser pane)

The automated test browser in this workspace runs persistently backgrounded
(`document.hidden === true`), which throttles `requestAnimationFrame` and can
make `getComputedStyle` return stale values. If verifying visual/timing
behavior in a new session:
- Prefer a **freshly-created tab** over a long-lived one (gets a brief grace
  period of normal speed).
- Override `requestAnimationFrame` with a `setTimeout` polyfill + frame
  counter to prove causality via before/after deltas, rather than trusting a
  single snapshot read.
- Use `canvas.toDataURL()` decoded to a file to actually see rendered pixels
  when screenshots are unreliable.
- Cross-check CSS via `el.matches(selector)` (CSSOM) if `getComputedStyle`
  looks suspicious.

## Plan file

`C:\Users\ethan\.claude\plans\lovely-munching-tide.md` currently holds the
UI-polish/Settings plan (already implemented — see item 14 above). It gets
overwritten on the next `EnterPlanMode` use, so don't rely on it persisting.
