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
- **Structures now sync** (added 2026-07-21, see branch state below for
  verification status): `Room.ts` tracks a `structures` Map, validates
  `build`/`upgrade` requests (reach check + a generous DoS-safety-net cap —
  resource cost is **not** server-validated, since harvesting isn't
  server-tracked either), and runs a per-tick combat pass for all 6 towers +
  spike + campfire. **Deliberately simplified**: flat per-level damage/heal
  only — no splash, chain lightning, crit/execute thresholds, toxic clouds,
  slow/freeze, or cannon ramp-up. Those are a documented, not-yet-started
  Phase 2 (see the header comment in `server/src/protocol.ts`'s Structure
  stats section and `Room.ts`'s `tickStructures()` doc comment for the full
  list). No traveling bullet entities for tower shots either — damage
  applies directly on cooldown, same as how `sniper` already worked
  client-side.
- Day/night, Blood Moon, shop, weapon/mutation choice: **zero server-side
  sync**, not started.

**Client (`src/net/`):**
- `socket.ts` — WebSocket wrapper: connect/reconnect (session-token
  persisted via localStorage), typed send (`sendMove`/`sendShoot`/
  `sendReady`) and receive (`onWelcome`/`onLobby`/`onPlayers`/`onZombies`/
  `onBullets`) callbacks.
- `ui/metaUI.ts`'s lobby functions were rewired from the old fake-bot local
  simulation to real networking — `openLobby()` connects, `lobbySetReady()`
  sends a real ready packet, `renderLobby()` shows real players + a
  live-ticking countdown. **PR #8 (`multiplayer-lobby-networking`) is
  merged into `main`** (2026-07-21) — check current status before assuming
  otherwise, but this part is done and live on `main`.
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
  Structures now sync the same way (`toClientStructure`) — but unlike
  zombies/bullets, `drawStructure()` was already fully parameterized (no
  hardwired-singleton problem), so no new render function was needed; the
  existing `structures` array/`setStructures()` is reused directly, same as
  zombies. `Structure` gained an optional `id` field (only set for
  server-synced structures) so upgrade clicks know which server entity to
  reference. `shopUI.ts`'s `tryBuildOrUpgrade()`/`upgradeInspectedStructure()`
  branch on `inNetMatch` to send `build`/`upgrade` requests instead of
  mutating local state directly — same pattern as `combat.ts`'s `tryShoot`.

**⚠️ Current branch state — read before doing anything else:**
- `multiplayer-lobby-networking` — **merged into `main` as of 2026-07-21**
  (PR #8). Its job is done; the branch itself can be deleted once you've
  confirmed nothing local still depends on it.
- `multiplayer-full-sync-wip` (**local only, NOT pushed, NO PR** — explicit
  instruction from the user was not to open a PR until this is fully
  complete) — contains the player/zombie/bullet sync described above, plus
  now structures sync (latest commit: `WIP: server-authoritative structures
  sync (Phase 1 combat, simplified)`). Structures/day-night/Blood
  Moon/shop/mutations are still the remaining "sync everything" work.
- **Visually confirmed working (2026-07-21)**, with two real browser clients
  in the same active match: remote-player rendering (`drawRemotePlayer` —
  name tag + HP bar + facing wedge, confirmed via a zoomed canvas capture),
  zombie sync (HUD `zombies: N` count matched the rendered blob count),
  and bullet sync (visible dashed trail on firing, server-authoritative
  per `combat.ts`'s `tryShoot`). This was the one open item from the prior
  session — it's done, this phase is visually solid, not just "no console
  errors."
- `main` had moved on **much more** than originally noted before this was
  caught and fixed — it wasn't just a resource-texture/terrain PR. Since
  this branch was originally cut, `main` had picked up a full tower-defense
  system (6 towers, Factory building, 5 upgrade levels), a Structure Click
  Inspector UI, an Iron ore resource node, and a full UI redesign
  ("Florr.io Neo-Brutalist theme"). **This has now been reconciled**: PR #8
  was fixed up and merged first (only real conflict was the generated
  `docs/index.html`, resolved by regenerating via `build:share` rather than
  hand-merging), then `multiplayer-full-sync-wip` was merged against the
  updated `main` (one small additive conflict in `systems/update.ts`, plus
  a type fix in `net/matchSync.ts` — main added required `id`/`armor`
  fields to `Zombie` for the new tower mechanics; synced zombies now reuse
  their existing cosmetic hash as `id` and default `armor` to 0, matching
  the documented "server doesn't model armor" gap). Verified after with a
  typecheck, full rebuild, a DOM-id integrity check (every `byId()` target
  still exists in the merged HTML), and a live 2-player match test.
- **Structures sync landed 2026-07-21, partially verified — read this
  before doing anything else with structures.** Placement sync and upgrade
  sync (including cross-player upgrades — any player can upgrade any
  structure, no ownership check) are each confirmed **twice**, with real
  two-browser-client tests, including one direct structure-state comparison
  showing byte-identical objects on both clients. **NOT yet exercised
  live**, though implemented in the same tick loop and typechecked/built
  clean: tower-vs-zombie combat, campfire healing a damaged player, and
  structure destruction/removal actually propagating. Verify those three
  first before building day/night/shop/etc. on top — the session that built
  this ran out of time/usage before finishing that part of the checklist.

**Recommended next steps, in order:**
1. ~~Finish visually verifying remote-player/zombie/bullet rendering~~ —
   done.
2. ~~Decide whether to merge PR #8 now or bundle it with fuller sync~~ —
   user chose to merge now; done.
3. ~~Reconcile `multiplayer-full-sync-wip` against `main`'s divergence~~ —
   user chose to do this now rather than keep deferring; done.
4. **Finish verifying structures sync** (see bullet above) — tower combat,
   campfire heal, structure destruction. All three should just work (same
   code path as the two already-verified pieces) but haven't been watched
   happen live yet.
5. Then: day/night + Blood Moon sync, then shop/weapon/mutation sync — each
   its own real chunk (new packet types, new server state), test-as-you-go.
6. Only open a PR once the user says it's ready — they were explicit about
   this.

**Do not push directly to `main`** — branch protection will reject it
anyway; use a feature branch + PR. **Do not deploy/expose the server
publicly** without checking `ALLOWED_ORIGINS` is set to the real domain
first, and without the user's explicit go-ahead (this touches shared/public
infrastructure once live).

## Known environment quirks (only relevant if testing in this Browser pane)

The automated test browser in this workspace runs persistently backgrounded
(`document.hidden === true` on every tab, confirmed 2026-07-21 — not just the
non-frontmost ones). This doesn't just throttle `requestAnimationFrame`, it
**fully stops it** (measured 0 callbacks over 3s) and can make
`getComputedStyle` return stale values. The `computer{action:"screenshot"}`
tool also reliably times out in this state — don't bother retrying it, go
straight to the canvas-dump workaround below.
- Override `requestAnimationFrame` with a `setTimeout`-based polyfill —
  **but timing matters**: this only works if the override is installed
  *before* the page's own game loop makes its first scheduling call. In
  this codebase specifically, `game.ts`'s `loop()` only calls
  `requestAnimationFrame` for the first time inside `resetGame()` (i.e.
  once a match actually starts) — if that first call already went out
  natively (tab hidden) before you patch, it's stuck pending forever and
  patching afterward does nothing (the loop never gets another chance to
  call it). Reload/open a fresh tab, install the shim immediately, *then*
  go through the join/match-start flow, so the very first call uses the
  shim. A quick probe confirms it's working: schedule a counter callback
  via `requestAnimationFrame` right after installing the shim and check it
  incremented after a `sleep` — native gives 0, the shim gave ~150/s.
- Use `canvas.toDataURL()` decoded to a file to actually see rendered
  pixels once the shim is confirmed working. Keep captures small (roughly
  2000–5000 base64 chars — a ~160×90 to ~320×180 JPEG) — larger payloads
  risk silent corruption somewhere in the tool-result → file round trip.
  **Always verify**: have the JS also return `b64.length`, write only the
  base64 payload (no `data:` prefix) to a file, decode with
  `base64 -d file.b64 > file.jpg`, and confirm the decoded byte count
  equals `floor(length/4)*3 - paddingChars` before trusting the image —
  a mismatch means transcription corruption, not a rendering bug. For
  precise numeric checks (e.g. "did entity X actually move"), reading
  pixels via `ctx.getImageData()` and computing centroids/positions in-JS
  is more reliable and far cheaper than eyeballing a screenshot.
- Cross-check CSS via `el.matches(selector)` (CSSOM) if `getComputedStyle`
  looks suspicious.
- For the `server/` backend specifically, the Browser pane doesn't apply —
  verify it with real WebSocket test scripts (`node -e "..."` using the
  built-in `WebSocket` global on Node 24+) instead.
- If a leftover `node`/`serve` process from a prior session is still
  bound to the server's port (8081) or the client's static port (8080),
  check for it (`netstat -ano`) before assuming the port is free — a
  previous session's server can outlive the session itself.
- **This Browser pane's tabs share `localStorage` with each other** (same
  origin, same storage partition — confirmed 2026-07-21). Since
  `net/socket.ts` persists the session token there, opening two "different"
  player tabs back-to-back without clearing it in between can make the
  second tab silently reuse the first tab's token, landing both in
  confusing, hard-to-debug states (e.g. each showing "(1/4)" independently
  instead of joining the same room). Fix: after navigating each fresh tab
  and before clicking into a match, run
  `localStorage.removeItem('nightfall_session_token')` via
  `javascript_tool`. Verify with `localStorage.getItem(...)` on both tabs if
  anything looks off — two tabs reporting the identical token value is the
  tell.
- **Clicking "select Team Mode" then "Enter/Queue Up" in the same batched
  tool-call message is racy** — the mode-select click doesn't always
  register before the second click fires, silently falling through to the
  solo-mode flow instead. Always split these into separate calls with a
  `read_page` (confirming the button now reads "QUEUE UP") in between.
- For verifying synced state precisely (exact positions/HP/tier/level,
  not just "something rendered"), it's more reliable to temporarily expose
  the relevant value on `window` from inside the matching `net.onX` handler
  in `net/matchSync.ts` (e.g. `(window as any).__debugStructures = next;`)
  than to infer it from pixels or DOM text — but mark it `// TEMP: remove
  before finalizing` and actually remove it (and rebuild) before treating
  the work as done. Left in this session's structures-sync commit history
  but removed before the final commit — grep for `__debug` if in doubt.
