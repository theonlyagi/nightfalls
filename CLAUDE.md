# NIGHTFALL.IO — session handoff / project memory

This file is for a fresh Claude Code session picking up this project. For
general project docs (architecture, folder layout, code layout, roadmap) see
[README.md](README.md). This file covers **what's changed recently and what's
still outstanding** — the stuff a new session wouldn't otherwise know.

## Repo / deployment facts

- GitHub repo: `theonlyagi/nightfalls` (private). **Two developers now push
  here** — verify with `git fetch origin` before assuming local state is
  current; don't trust a stale local checkout.
- `main` is **branch-protected**: PRs required to merge (direct pushes and
  force-pushes to `main` are rejected). Workflow is: push a feature branch →
  open a PR → merge on GitHub. Required approving reviews is currently 0
  (a PR is mandatory, but not a second reviewer).
- GitHub Pages serves **`docs/index.html`** only (Settings → Pages → Deploy
  from branch → `main` → `/docs`), so the published site is always the
  obfuscated single-file bundle, never source.
- Live site: `https://theonlyagi.github.io/nightfalls/`
- ⚠️ **`npm run build` does NOT update `docs/`.** It only rebuilds
  `public/game.js`. The live site only updates after `npm run build:share`
  (which reruns build, then regenerates+minifies `docs/index.html`) — there
  is no CI to do this automatically. **Already bit us once**: three merged
  PRs (tree/rock visuals, wolf zombie, double XP) all verified fine locally
  but never reached the published site because only `npm run build` was run
  before committing, not `npm run build:share`. Fixed in a follow-up PR
  that just reran `build:share` with no source changes. **Going forward:
  before committing any gameplay/client change, run `npm run build:share`
  and stage `docs/index.html` too, not just `public/game.js`.**
- Client build now uses **esbuild** (`npm run build` → bundles `src/game.ts`
  into `public/game.js`), not raw `tsc`. `src/` is split into
  `constants.ts`, `game.ts`, `render/`, `state.ts`, `systems/`, `ui/`,
  `utils.ts` (a teammate's refactor — the very old monolithic
  single-file `game.ts` is gone).
- Debug/cheat console: press **Home** in-game, password **`agi123`**. It's a
  local testing tool, not a real security gate (says so on the panel itself).

## ⚠️ Outstanding: multiplayer — client networking now exists, but is NOT fully synced yet

The user's plan: instant-queue Team Mode (no browsing rooms), 2-4 players,
everyone readies up, a 3s countdown that cancels on unready/new-joiner, then
the match starts for real. User wants deployment on `night-falls.xyz`
(Linode VPS + Cloudflare DNS-only for the WS subdomain + Let's Encrypt) —
**not started yet as of this writing**, confirm current status before
assuming otherwise. User has explicitly said: **sync everything** (not a
stripped-down v1) — structures, day/night, Blood Moon, shop, and
weapon/mutation choices should all eventually be server-authoritative too,
not just position/zombies/bullets.

**Server (`server/`, standalone Node/TypeScript/uWebSockets.js, AGPL-3.0 —
see `server/NOTICE.md`):**
- `Room.ts` now has a real **`waiting → countdown → active`** state machine
  (not instant-simulate-on-connect like the first pass). 2-4 players, all
  ready → 3s countdown → any unready/disconnect/new-joiner cancels and
  re-evaluates fresh → match activates (zombie spawning/ticking only starts
  here). New joiners never land in an already-active room even with open
  slots. Player moves now carry `angle`; `PlayerSnapshot`/`LobbyPlayerSnapshot`
  broadcast `name` + `angle` too.
- Zombie model is still **generic/flat** — one wander-and-chase archetype,
  no types (normal/scout/brute/wolf/spider/witch/etc. from the client don't
  exist server-side). This is the biggest gap for true "sync everything"
  parity — porting `ZTYPE`/`pickZombieType`/the ranged & explode & summon AI
  from `src/systems/update.ts` to the server is unstarted.
- Bullets are single-generic-type only — no weapon awareness (no pellet
  count/spread for shotgun/dualguns, no explosive/burn). `ShootPacket` only
  carries `angle`.
- Structures, day/night, Blood Moon, shop, weapon/mutation choice: **zero
  server-side sync**, not started.

**Client (`src/net/`):**
- `socket.ts` — WebSocket wrapper: connect/reconnect (session-token
  persisted via localStorage), typed send (`sendMove`/`sendShoot`/
  `sendReady`) and receive (`onWelcome`/`onLobby`/`onPlayers`/`onZombies`/
  `onBullets`) callbacks.
- `ui/metaUI.ts`'s lobby functions were rewired from the old fake-bot local
  simulation to real networking — `openLobby()` connects, `lobbySetReady()`
  sends a real ready packet, `renderLobby()` shows real players + a
  live-ticking countdown. **This part (PR #8, branch
  `multiplayer-lobby-networking`) is open and tested but not yet merged** —
  check its status before assuming it's still pending.
- `net/matchSync.ts` (new, **not in a PR yet — see below**) — bridges server
  snapshots into actual gameplay once a match is active: `inNetMatch` flag
  in `state.ts` gates everything (solo play untouched). Sends throttled
  move/shoot, converts sparse server zombie/bullet snapshots into the
  client's full entity shapes (deterministic per-id cosmetic hashing so they
  don't flicker), renders other players via a new simplified
  `drawRemotePlayer` (not the detailed local-player art — `drawPlayer`/
  `drawWeapon` are hardwired to the single local `player` singleton
  throughout, not parameterized, so reusing them for remote players wasn't
  feasible without a bigger refactor). Local zombie AI/spawning/bullet
  movement (`updateZombies`/`updateBullets`/`updateWaves`) are skipped
  entirely during a net match so they don't fight the server's snapshots.

**⚠️ Current branch state — read before doing anything else:**
- `multiplayer-lobby-networking` (pushed, **PR #8 open, not merged**) —
  ready-up/countdown lobby. Complete and tested.
- `multiplayer-full-sync-wip` (**local only, NOT pushed, NO PR** — explicit
  instruction from the user was not to open a PR until this is fully
  complete) — contains the player/zombie/bullet sync described above, on
  top of the lobby branch. Latest commit: `WIP: in-match player/zombie/
  bullet sync (Phase 3/4, incomplete)`.
- Verified so far on the WIP branch: server-side move+angle+name sync
  confirmed correct in real time between real WS clients; browser client
  connects, reaches an active match, zero console errors, canvas renders
  non-blank content. **NOT yet visually confirmed** that the remote-player
  avatar/zombies/bullets actually render correctly on screen — the
  Browser pane's screenshot tool was unreliable this session (see quirks
  section below), was mid-way through a `canvas.toDataURL()` fallback when
  the session paused. **Do this visual check first** before building
  further on top.
- `main` has moved on since this branch was cut (teammate pushed a resource
  texture/terrain visual PR) — expect to rebase/merge before this is
  mergeable.

**Recommended next steps, in order:**
1. Finish visually verifying remote-player/zombie/bullet rendering actually
   looks right (not just "no errors") before adding anything else.
2. Decide whether to merge PR #8 (lobby) on its own first, or keep bundling
   it with the fuller sync work — user hasn't been asked this directly.
3. Structures sync, then day/night + Blood Moon sync, then shop/weapon/
   mutation sync — each is its own real chunk (new packet types, new server
   state), test-as-you-go like every other phase so far.
4. Only open a PR once the user says it's ready — they were explicit about
   this.

**Do not push directly to `main`** — branch protection will reject it
anyway; use a feature branch + PR. **Do not deploy/expose the server
publicly** without checking `ALLOWED_ORIGINS` is set to the real domain
first, and without the user's explicit go-ahead (this touches shared/public
infrastructure once live).

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
- For the `server/` backend specifically, the Browser pane doesn't apply —
  verify it with real WebSocket test scripts (`node -e "..."` using the
  built-in `WebSocket` global on Node 24+) instead.
