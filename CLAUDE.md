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
- ⚠️ **`npm run build` now runs through `scripts/build-client.js`** (added
  2026-07-22, replacing a raw `esbuild` CLI call) so `WS_URL` can be baked
  in from the environment at build time — see the multiplayer section's
  deployment-status entry for the full mechanism. **New failure mode this
  adds, in the same family as the `docs/` staleness risk above**: running
  `npm run build:share` for a real release *without* first setting
  `WS_URL=wss://night-falls.xyz` will silently publish `docs/index.html`
  pointing at `ws://localhost:8081` — no error, just a broken multiplayer
  connect for anyone who loads the live site. `npm run watch` is
  unaffected (still the old raw esbuild CLI, always defaults to
  localhost) — this only matters for whichever build produces the release
  that actually gets published.
- Debug/cheat console: press **Home** in-game, password **`agi123`**. It's a
  local testing tool, not a real security gate (says so on the panel itself).

## ⚠️ Outstanding: multiplayer — client networking now exists, but is NOT fully synced yet

The user's plan: instant-queue Team Mode (no browsing rooms), 2-4 players,
everyone readies up, a 3s countdown that cancels on unready/new-joiner, then
the match starts for real. User wants deployment on `night-falls.xyz`
(Linode VPS + Cloudflare DNS-only for the WS subdomain + Let's Encrypt).
User has explicitly said: **sync everything** (not a stripped-down v1) —
structures, day/night, Blood Moon, shop, and weapon/mutation choices should
all eventually be server-authoritative too, not just position/zombies/bullets.

⚠️ **Deployment status: LIVE as of 2026-07-22.** `night-falls.xyz` is up
and running the multiplayer server for real — see "First real run" further
down for the deploy itself and the permission bug that was found and fixed
along the way. Infra side (VPS/DNS/TLS/nginx/systemd) was originally set up
in a *separate* Claude session with actual VPS console access ("Claude
console" per the user); this session gained actual SSH access partway
through (the key the other session set up at `~/.ssh/nightfalls_key` turned
out to also be present here) and used it, with the user's explicit
go-ahead, to run the deploy and fix the permission bug directly. As
reported/found: Linode VPS at `74.207.234.155`, Ubuntu 24.04, DNS for
`night-falls.xyz`/`www.night-falls.xyz` live, Let's Encrypt cert (auto-
renews, HTTP→HTTPS redirect), nginx reverse-proxying 443/80 →
`127.0.0.1:3000` (WS upgrade headers on `/ws`, static files served
directly from `/var/www/nightfalls/public` for `/`), Node.js 22, and a
`nightfalls.service` systemd unit (user `nightfalls`, working dir
`/var/www/nightfalls`, `PORT=3000`) — now actually running the deployed
code, confirmed via a live WebSocket test, not just "service is active."

⚠️ **Second, more severe deploy bug found and fixed same day, after the
first deploy already "succeeded": `scripts/deploy.sh` baked in
`WS_URL="wss://night-falls.xyz"` — missing the `/ws` path.** This meant
every *real* browser client (not my own raw WebSocket test scripts, which
had `/ws` hardcoded) was connecting to `/` — nginx's static-file location —
instead of `/ws`, the one actually proxied to the game server. The
handshake just silently failed for real users; two players queuing would
never see each other (each stuck alone in their own client-side lobby
state, showing 0/4 or 1/4 depending on timing, never converging), even
though the server's own room-assignment logic (`RoomManager.assign()`) was
completely correct the whole time — confirmed by testing it directly with
raw WebSocket connections both locally and against production (4 landed in
one room, a 5th correctly got a new one) *before* finding this bug, which
is what made it clear the problem was in the URL, not the room logic.
**Found by reproducing the exact user-reported symptom** ("queue shows
1/4, friend joins, still shows 1/4, never end up together") with two real
browser tabs against the live site (properly cleared `localStorage`
between them, ruling out the unrelated shared-token quirk noted in this
doc's environment-quirks section) plus a runtime `WebSocket` constructor
wrapper to log the actual connection URL each client used — that's what
directly exposed the missing `/ws`. **Fixed**: `scripts/deploy.sh`'s
`WS_URL` now reads `wss://night-falls.xyz/ws`; redeployed (client-only
change, no server code touched) and reverified with two real browser tabs
— both now correctly see each other and stay in sync in real time. Every
multiplayer connection between the first deploy and this fix would have
been broken for real users, worth keeping in mind if anyone reports having
tried the site earlier in the day and bounced off it.

**Code-side readiness for that setup, checked/fixed 2026-07-22:**
- `ALLOWED_ORIGINS` — **already correct, no change needed.**
  `server/src/index.ts` reads `process.env.ALLOWED_ORIGINS`, splits on
  comma, trims each entry, filters empties — `https://night-falls.xyz,
  https://www.night-falls.xyz` (with or without a space after the comma)
  will parse correctly as-is. Just needs that env var actually set on the
  VPS side (systemd unit or equivalent) — nothing to change here in code.
- `WS_URL` — **fixed, now build-time env-driven instead of a hardcoded
  constant.** Client JS has no runtime `process.env` (it's a static browser
  bundle), so build time is the only point a production URL can be baked
  in. Added `scripts/build-client.js` (a thin Node wrapper around esbuild's
  JS API, replacing the old raw `esbuild` CLI call in `npm run build`) that
  reads `process.env.WS_URL` and passes it to esbuild's `define` as
  `__WS_URL__`; `src/constants.ts` now reads `WS_URL` from that
  build-time constant, falling back to `ws://localhost:8081/ws` if unset
  (kept safe via a `typeof __WS_URL__ !== 'undefined'` guard, so `npm run
  watch` — still the old raw CLI, untouched — keeps working for local dev
  without ever needing to define it). **To produce the real production
  bundle**: set `WS_URL=wss://night-falls.xyz` (no port — nginx terminates
  TLS and proxies internally to 3000, matching what's reported set up)
  before running `npm run build` or `npm run build:share`. Verified both
  paths: unset build still bakes in localhost, `WS_URL=wss://night-falls.xyz
  npm run build` correctly bakes the real URL into `public/game.js` (grepped
  the output to confirm), then rebuilt back to the localhost default
  afterward so local dev/testing wasn't left pointing at production.
- **Entry point — fixed 2026-07-22 from the VPS-console session (the "other
  session" this doc previously referred to).** `ExecStart` in
  `nightfalls.service` now points at `node dist/index.js` (matches
  `server/package.json`'s actual compiled output), no longer the incorrect
  flat `server.js`. `ALLOWED_ORIGINS=https://night-falls.xyz,
  https://www.night-falls.xyz` is now also set directly in the systemd unit
  (`Environment=` line), so nothing needs to be done code-side for it —
  confirmed already env-driven as noted below.
- ⚠️ **New gap found by the VPS session, 2026-07-22, not previously known
  to either session: the uWebSockets server never serves the client's
  static files.** `server/src/index.ts` only defines `/health` and `/ws`
  routes (`app.get`/`app.ws`) — there is no static-file serving for
  `index.html`/`game.js`/`styles.css`/`assets/` at all. The VPS's nginx
  config was originally proxying *everything* to the Node process, which
  would have 404'd the actual game page. **Fixed on the nginx side**: nginx
  now serves `/var/www/nightfalls/public` directly as static files (`root`
  + `try_files`) for `/`, and only reverse-proxies `/ws` and `/health` to
  `127.0.0.1:3000`. **This means the deploy flow needs to land the built
  `public/` directory (repo root's `public/`, built via `npm run build` /
  `build:share` with `WS_URL` set) into `/var/www/nightfalls/public`**, in
  addition to `server/dist/` (→ `/var/www/nightfalls/dist`) and
  `server/package.json` for `npm install`. Full expected layout on the VPS:
  ```
  /var/www/nightfalls/
    dist/            (server/dist/*, compiled via tsc)
    package.json     (server/package.json, for npm install — has the
                       native uWebSockets.js dependency, must be installed
                       ON the VPS/matching arch, not copied from a dev
                       machine's node_modules)
    public/           (repo-root public/*, built with WS_URL set)
  ```
  `scripts/deploy.sh` (run via `npm run deploy`) builds the server
  (`server`: `npm run build`) and client (root: `WS_URL=wss://night-falls.xyz
  npm run build`), uploads `server/dist/`, `server/package.json`, and
  `public/` to `/var/www/nightfalls` via `scp` (using
  `~/.ssh/nightfalls_key`), runs `npm install --omit=dev` **on the VPS**
  (required — `uWebSockets.js` is a native module and must be installed on
  the target arch, not copied from a dev machine's `node_modules`), then
  `chown`s to the `nightfalls` user and restarts `nightfalls.service`.
  Known limitation: uses `scp`, not `rsync --delete`, so files removed
  locally aren't removed from the VPS — fine for now.

  ⚠️ **First real run, 2026-07-22 — site is now live, but read this before
  the next deploy.** The script itself ran clean (build → upload → `npm
  install` → restart, service came up active). The site still 404'd on
  first load, though — a bug the script's success didn't reveal:
  `/var/www/nightfalls` itself was `750` (`nightfalls:nightfalls`, no
  "other" access) from whenever the directory was first created, and
  nginx's worker runs as `www-data`, which isn't `nightfalls` and isn't in
  that group. `www-data` therefore couldn't even *traverse into*
  `/var/www/nightfalls` to reach `public/` — irrelevant that `public/`
  itself and everything under it was already correctly `755`/world-
  readable, since Linux directory traversal requires execute permission on
  every parent in the path, not just the final one. `try_files ... =404`
  turns a permission-denied stat/open at any point in that chain into a
  plain 404, not a 403, which is why it looked like a missing-file problem
  rather than a permissions one. **Fixed**: `chmod o+x /var/www/nightfalls`
  — adds *only* traverse, not read, so `www-data` can reach the known
  `public/` subpath without being able to `ls` the directory and see
  `dist/`/`package.json`/`node_modules` exist. This is a one-time fix to
  the directory as it exists now; `deploy.sh` doesn't set this permission
  itself (it only `chown`s, never `chmod`s), so if `/var/www/nightfalls`
  is ever recreated from scratch this will need reapplying — worth adding
  a `chmod o+x` step to `deploy.sh` itself if that's ever a concern, not
  done yet.

  **Confirmed live and fully working after the permission fix**: page
  loads with no console errors, and a raw WebSocket test
  (`node -e` with the built-in `WebSocket` global, against
  `wss://night-falls.xyz/ws`) connected and received a correct `players`
  snapshot from the server — the actual multiplayer path works end-to-end
  in production, not just "the process is running."

  ⚠️ **Separate, non-blocking issue found while checking this: `/health`
  returns 505** ("HTTP Version Not Supported"). The `location /health`
  block in nginx proxies to the Node process without `proxy_http_version
  1.1;` — nginx defaults to `1.0` for the upstream connection when that
  directive is omitted, and uWebSockets explicitly rejects HTTP/1.0
  requests. The `location /ws` block already has `proxy_http_version 1.1;`
  set (needed for the WS upgrade), which is exactly why the actual game
  connection is unaffected — this only breaks the standalone health-check
  endpoint, nothing gameplay-related. **Not fixed** — it's a one-line
  nginx config addition + reload, but nginx config is the VPS-console
  session's domain, not edited from here without checking first; flagged
  for a decision rather than changed unilaterally.

**Server (`server/`, standalone Node/TypeScript/uWebSockets.js, AGPL-3.0 —
see `server/NOTICE.md`):**
- `Room.ts` now has a real **`waiting → countdown → active`** state machine
  (not instant-simulate-on-connect like the first pass). 2-4 players, all
  ready → 3s countdown → any unready/disconnect/new-joiner cancels and
  re-evaluates fresh → match activates (zombie spawning/ticking only starts
  here). New joiners never land in an already-active room even with open
  slots. Player moves now carry `angle`; `PlayerSnapshot`/`LobbyPlayerSnapshot`
  broadcast `name` + `angle` too.
- Zombie model is still **generic/flat** — no types (normal/scout/brute/
  wolf/spider/witch/etc. from the client don't exist server-side). This is
  the biggest gap for true "sync everything" parity — porting `ZTYPE`/
  `pickZombieType`/the ranged & explode & summon AI from
  `src/systems/update.ts` to the server is unstarted.
  ⚠️ **Corrected 2026-07-22, then fixed same day**: this was previously
  described as a "wander-and-chase archetype" — that was wrong at the time
  (`tickZombiesMovement()` was pure random jitter, zero reference to player
  position). **Now actually implemented**: `tickZombiesMovement()` finds
  the nearest *alive* player and moves the zombie straight at them at a
  flat `ZOMBIE_CHASE_SPEED` (90 u/s, a fresh constant in `protocol.ts` —
  there's no prior client-side value to match since the client's per-type
  `speedMul` system isn't ported). Falls back to the old random jitter only
  when no one is alive (so zombies don't freeze mid-map). **Confirmed live
  2026-07-22**: a zombie closed 255→3 world units on a stationary player in
  ~3 real seconds, moving in a clean straight line. Still just one generic
  archetype/speed — no scout/brute/wolf variety, no ranged/explode/summon
  behavior; that porting work is unchanged/unstarted.
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
  ⚠️ **Gap found 2026-07-22, fixed same day**: there was no code path
  server-side that damaged a *structure's* hp — `resolveCollisions()` only
  did bullet-vs-zombie and zombie-vs-player; `tickStructures()` only did
  structures-attacking-zombies/players, never the reverse. **Now fixed**:
  `resolveCollisions()` has a new zombie-vs-structure loop, same
  cooldown-gated-flat-damage shape as the existing zombie-vs-player loop
  right above it (reuses `ZOMBIE_DAMAGE`/`ZOMBIE_HIT_COOLDOWN_MS` rather
  than new constants — roughly matches the client's solo-mode ~14/sec
  melee-vs-structure rate over a 600ms window). `ZombieState` gained a
  `lastHitStructureAt` field, independent of `lastHitPlayerAt`, so a zombie
  can damage a player and a structure in the same tick if both are in
  range. **Deliberately does not add collision/blocking physics** — unlike
  the client's solo-mode version (which pushes the zombie back and treats
  the structure as a real obstacle), server zombies walk straight through
  structures the same way they already walk through players/each other;
  only proximity-based damage was added, matching this server's existing
  no-collision movement model everywhere else. **Confirmed live
  2026-07-22**: a freshly-placed 40hp spike was destroyed by real zombie
  contact within ~4 seconds of a fresh match starting, removed identically
  on both clients — via the actual gameplay trigger this time, not the
  temporary forced-test patch from earlier in the day (see below). The
  existing `if (s.hp <= 0) this.structures.delete(s.id)` cleanup in
  `tickStructures()` is no longer dead code.
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
- **Structures sync landed 2026-07-21; verification checklist now fully
  closed out as of 2026-07-22 — read this before doing anything else with
  structures.** Placement sync and upgrade sync (including cross-player
  upgrades — any player can upgrade any structure, no ownership check) are
  each confirmed **twice**, with real two-browser-client tests, including
  one direct structure-state comparison showing byte-identical objects on
  both clients.
  **Tower-vs-zombie combat: confirmed live 2026-07-22.** Built a cannon
  next to a manually-walked-in zombie in a real 2-client match; the
  zombie's hp dropped to 0 and it was removed from `__debugZombies`
  identically on both clients, with the cannon's `aimAngle` reflecting
  live target-tracking.
  **Campfire healing a damaged player: confirmed live 2026-07-22.** Took a
  real zombie hit (100→92 hp, matches `ZOMBIE_DAMAGE=8`), placed a campfire
  within `CAMPFIRE_HEAL_RADIUS`, watched hp recover back to 100 — synced
  identically on both clients.
  **Structure destruction/removal propagating: confirmed twice, 2026-07-22.**
  First pass (earlier that day) verified the removal/broadcast plumbing
  only — nothing could reduce a structure's hp yet, so a spike's hp was
  temporarily forced to 0 via a `setTimeout` in `handleBuild` (marked
  `// TEMP`, reverted/rebuilt before finishing) to prove
  `tickStructures()`'s delete-and-broadcast path worked in isolation.
  Second pass (later that same day, after the zombie-vs-structure damage
  fix above) confirmed the **real** end-to-end path: a freshly-placed spike
  was destroyed by actual zombie contact within ~4 seconds, no artificial
  patch involved, removal synced identically on both clients. Destruction
  is now a genuine, testable mechanic, not just reachable cleanup code.

- ✅ **`main`'s divergence reconciled, 2026-07-22** (was flagged above as
  outstanding for most of the day — a teammate's push not showing up on
  `night-falls.xyz` is what prompted actually doing this). Merged
  `origin/main`'s 4 commits (Florr.io menu/GUI redesign, PNG-asset tower
  rendering, structure remove feature + floating inspection UI + 32px tile
  scaling) into `multiplayer-full-sync-wip`. Real conflicts were only in
  `src/ui/shopUI.ts` (simple additive import conflict — both sides added
  different imports to the same block, resolved by keeping both) plus the
  two generated files (`docs/index.html`, `public/game.js`, resolved by
  rebuilding via `build:share`/`build` rather than hand-merging, same
  practice as the PR #8 merge). Verified after: clean typecheck (both
  client and server), a DOM-id integrity check (every `byId()` target in
  source has a matching element in `public/index.html`), and a live
  solo-mode smoke test (menu loads, no console errors). Landed as three
  commits: the zombie-AI/structure-damage work from earlier the same day,
  the deployment tooling, and the merge itself.
  - **`removeInspectedStructure()`'s missing network-awareness — fixed as
    part of this merge, not left broken.** Added a `RemovePacket` type +
    `isRemovePacket` validator (`server/src/protocol.ts`),
    `Room.handleRemove()` (`server/src/index.ts` wires it up) — same
    reach/existence validation as `handleUpgrade`, no ownership
    restriction, matching the existing Phase 1 model. Client:
    `sendRemove`/`sendNetRemove` added alongside the existing
    `sendBuild`/`sendUpgrade` pair; `removeInspectedStructure()` now
    branches on `inNetMatch` exactly like `upgradeInspectedStructure()` —
    refund/particle effects fire immediately either way (client-local
    bookkeeping, same as build/upgrade cost), but the actual structure
    deletion goes through the server in a net match instead of mutating
    `structures` directly. **Verified via a raw two-client WebSocket test**
    (build a wall, send `remove` for its id, confirm *both* connected
    clients' subsequent `structures` snapshots show it gone) — this
    exercises the exact server-side mechanism the real UI button calls.
    Live canvas-click UI verification (actually clicking the 🗑️ REMOVE
    button in a browser) was attempted but kept getting beaten by this
    environment's own flakiness (aggressive chase AI killing test
    characters mid-setup, and one instance of the render loop's RAF calls
    dropping to zero requiring a full page reload to recover — see updated
    quirks entries below) rather than any actual code issue; confidence
    here rests on the protocol-level test plus the client change being a
    structural mirror of the already-proven `upgrade` path, not a live
    click-through.
  - The `TILE`/`BUILD_REACH` rescale (64→32 tile, reach 3→6 tiles) from
    main still equals the same absolute `BUILD_REACH=192` the server
    hardcodes (`server/src/protocol.ts`), so no numeric break — but it's a
    reminder the server keeps its own duplicated copy of these constants
    rather than importing from `src/`, so future client-side balance
    tweaks silently won't reach the server unless mirrored by hand.
  - ⚠️ **`night-falls.xyz` has NOT been redeployed with any of this yet**
    as of this writing — the live site is still running the pre-merge
    build. Confirm with the user before redeploying (same rule as every
    other production action this session) — don't assume it's wanted
    immediately just because the merge is done.

**Recommended next steps, in order:**
1. ~~Finish visually verifying remote-player/zombie/bullet rendering~~ —
   done.
2. ~~Decide whether to merge PR #8 now or bundle it with fuller sync~~ —
   user chose to merge now; done.
3. ~~Reconcile `multiplayer-full-sync-wip` against `main`'s divergence~~ —
   user chose to do this now rather than keep deferring; done.
4. ~~Finish verifying structures sync~~ — tower combat, campfire heal, and
   (as of later the same day) real structure destruction all confirmed live
   2026-07-22.
5. ~~Port zombie-vs-structure melee damage + fix the missing chase AI~~ —
   done 2026-07-22, same session as step 4, once the user confirmed they
   wanted these closed before considering a launch (see below). Both are
   now real, confirmed-live mechanics, not just plumbing.
6. ~~Confirm `ALLOWED_ORIGINS`/`WS_URL` are ready for the real domain~~ —
   done 2026-07-22. `ALLOWED_ORIGINS` needed no code change (already
   env-driven); `WS_URL` is now build-time env-driven via
   `scripts/build-client.js`. Entry-point naming was resolved by the
   VPS-console session (`ExecStart` now points at `dist/index.js`), not by
   changing the build.
7. ~~First real deploy to `night-falls.xyz`~~ — done 2026-07-22, with the
   user's explicit go-ahead. `npm run deploy` (`scripts/deploy.sh`) ran
   clean end-to-end; hit a site-wide 404 from a pre-existing directory-
   permission gap (unrelated to the script itself), diagnosed and fixed
   live (see the deploy-status section's "First real run" entry for the
   full story). My own raw-WebSocket smoke test passed right after, but
   that turned out to be a false green — see next item. One small
   non-blocking loose end still open: `/health` returns 505 (separate
   nginx config gap, doesn't affect gameplay) — flagged, not fixed, needs
   a decision on who touches nginx config next.
8. ~~Fix real multiplayer connections actually working for real users~~ —
   done 2026-07-22, same day as the first deploy. The user reported two
   players queuing never seeing each other (stuck at 0/4 or 1/4,
   inconsistently) — root cause was `deploy.sh`'s `WS_URL` missing the
   `/ws` path, so every real browser client silently failed its WS
   handshake against the wrong nginx location. Full story in the
   deployment-status section's second ⚠️ bullet. Fixed, redeployed
   (client-only), reverified live with two real browser tabs actually
   seeing each other and syncing in real time. **This means multiplayer
   was effectively non-functional for real users from the first deploy
   until this fix, same day** — worth knowing if anyone reports having
   bounced off the site earlier.
9. ~~Reconcile the `main` divergence, including fixing
   `removeInspectedStructure()`'s missing network-awareness~~ — done
   2026-07-22, prompted by the user noticing a teammate's push wasn't
   showing up on `night-falls.xyz` (see the ✅ bullet above for the full
   story). Not merged-and-left-broken — the remove-networking gap was
   fixed as part of the same work, verified via a raw two-client
   WebSocket test.
10. **`night-falls.xyz` needs a redeploy to actually pick up any of this**
    — the merge, the zombie AI/structure damage fixes, and the
    remove-networking fix are all only committed locally so far, not yet
    pushed to the live site. Confirm with the user before running
    `npm run deploy` again (standing rule: every deploy needs fresh
    go-ahead, per the classifier's own enforcement earlier the same day).
11. Then: day/night + Blood Moon sync, then shop/weapon/mutation sync — each
    its own real chunk (new packet types, new server state), test-as-you-go.
    **This is now post-launch work** — the site is live with a subset of
    "sync everything" — confirm with the user whether/when these still
    matter now that something real is already up.
12. Only open a PR once the user says it's ready — they were explicit
    about this. Note the deployed server code is running directly off
    this branch's build output, not off `main` — the branch-vs-PR
    question is about the *repo*, separate from what's live on the VPS.

**Do not push directly to `main`** — branch protection will reject it
anyway; use a feature branch + PR. **Deploying/exposing the server
publicly now requires re-confirming with the user each time**, same as
before — the fact that the first deploy already happened with explicit
go-ahead (2026-07-22) doesn't carry forward as standing authorization for
future deploys; ask again.

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
  Note this only needs installing on the *client* — server-side combat/
  sync ticks run on the Node process's own timer, completely independent
  of any browser tab's visibility state, so waiting/polling for
  server-driven state changes (combat, healing, destruction) via plain
  `sleep` + a separate check call is fine; the quirks below about
  needing real in-page timing are specific to *client-driven input*
  (movement, UI), not to observing server broadcasts.
- **`get_page_text` is unreliable for this app — confirmed 2026-07-22.**
  It reads a fixed element (looked like `<main>`) regardless of whether
  it (or an ancestor) is actually `display:none`; it happily returned the
  full main-menu text (name field, mode select, etc.) while that overlay
  was confirmed hidden and a completely different overlay was the one
  actually visible. Don't use it to confirm *which* overlay/screen is
  currently shown in this app's overlay-stack UI. Use direct DOM queries
  instead: `el.offsetParent !== null` (or `getComputedStyle(el).display`)
  on the specific heading/button you expect, e.g.
  `Array.from(document.querySelectorAll('h1,h2,h3')).filter(h =>
  h.offsetParent !== null).map(h => h.textContent)`.
- **Ref-based clicking (`computer{action:"left_click", ref:...}`) silently
  fails for this app's custom clickable elements** — e.g. the mode-select
  cards and other `div`-with-onclick elements (not real `<button>` tags)
  resolved to a `(0,0)` coordinate and clicked nothing, with no error.
  `read_page`'s `interactive` filter also badly undercounts elements in
  this app (misses things later confirmed clickable, and inconsistently
  omits elements that showed up moments earlier under the `all` filter).
  Most reliable approach found: skip `computer`/`read_page`-ref clicking
  for this app entirely and dispatch synthetic DOM events directly via
  `javascript_tool` (`el.click()`, or `dispatchEvent(new MouseEvent(...))`
  for canvas coordinates) — confirm success by checking resulting state
  (e.g. a CSS class change, a button's text changing to "QUEUE UP") rather
  than trusting the click call's own return value.
- **Debug-console interactions (Home-key panel: unlock, grant resources,
  etc.) also need real elapsed time between steps**, same underlying cause
  as the `requestAnimationFrame`-shim issue below — the panel's state
  change (e.g. becoming unlocked, revealing the resource-grant inputs)
  is gated behind a render tick that won't happen if everything is
  dispatched synchronously in one script with no `await` in between.
  Cramming open→unlock→set-value→click-add into one synchronous script
  silently no-ops (values stay at 0); adding real waits (~300-400ms) via
  `await new Promise(r => setTimeout(r, ms))` between each step fixes it.
- **Short/precise player-movement bursts are unreliable, and this is a
  refinement of the `requestAnimationFrame`-shim quirk above, not a
  separate issue.** The shim's own `setTimeout(fn, 16)` callbacks are
  *themselves* subject to the same background-tab throttling — in a
  sufficiently-backgrounded tab, Chrome can clamp them to firing far less
  often than every 16ms. A brief keydown-then-keyup (a few hundred ms)
  dispatched between two separate tool calls can land entirely *between*
  two rare shim firings and register as if the key was never pressed —
  and because each tool call round-trip itself adds unpredictable real
  elapsed time on top of any explicit `sleep`, two nominally-identical
  "hold key for 150ms" attempts can produce wildly different (or
  wrong-direction) results. Fix: control hold duration with a real
  in-page timer inside **one** `javascript_tool` script — `await new
  Promise(r => setTimeout(r, ms))` between a `keydown` and its matching
  `keyup` — never split a single timed hold across two separate tool
  calls (a `sleep` in between measures the wrong thing). Prefer holds of
  500ms or longer for reliable, reproducible distance; anything shorter is
  a coin flip in this environment. First calibrate speed with one clean
  single-axis hold (e.g. hold `d` alone for exactly 500ms via the in-page
  timer) before trying to navigate anywhere — measured this session at
  ~120 units/sec for a base-speed player, single axis.
- **Zombies drift randomly if no one is alive to chase, which can still
  invalidate a precomputed heading.** (Historical note: this was written
  when zombie movement was pure random jitter with no chase AI at all —
  see the corrected zombie-movement entry above, chase AI now exists as of
  2026-07-22. The jitter fallback only applies now when every player is
  dead.) If you still need to walk a player to a specific zombie for any
  reason, use a closed-loop pursuit *inside one script*: recompute the
  direction from current positions every ~150-200ms, tap the corresponding
  keys for just that interval, and break out the moment either hp drops
  (contact happened) or distance crosses a small threshold (~40-50 units)
  — don't commit to one long fixed-direction hold aimed at a stale
  position. In practice, with chase AI now live, it's usually easier to
  just stand still and let a zombie come to you (see the player-death
  bullet below for why that's now riskier too).
- **Player death is permanent for a match — there is no respawn.**
  `Room.ts` sets `p.alive = false` at 0 hp and nothing ever sets it back;
  `handleMove`/`handleShoot`/`handleBuild`/`handleUpgrade` all early-return
  on `!p.alive`, so a dead player's client silently stops affecting
  anything server-side (their character will appear frozen — this is
  *expected*, not a bug, if you see it mid-test). `ZOMBIE_DAMAGE` is a
  mild 8 hp per hit with a 600ms per-zombie cooldown
  (`server/src/protocol.ts`), but **lingering near a zombie across several
  slow tool-call round-trips lets multiple cooldown windows elapse
  unnoticed**, and the damage adds up fast enough to kill from full hp
  within what feels like "just checking the distance a couple more
  times." Retreat hard (and check `alive`, not just `hp`) the moment any
  hp drop is detected, in the same script, rather than reacting in a
  follow-up tool call.
  ⚠️ **This got much more dangerous 2026-07-22 once zombie chase AI was
  fixed** (see above) — zombies now reliably reach a stationary player
  within a few real seconds instead of never. Twice this session, both
  test players died fully unattended (spawned, then simply weren't acted
  on for the next several tool calls) because multiple zombies converged
  on the shared spawn point faster than expected. **Any multi-step flow
  spanning "match starts" needs to happen in as few real tool-call
  round-trips as possible** — every gap between calls is extra real
  wall-clock time (your own reasoning/typing time counts too, not just
  explicit `sleep`s) for zombies to close in. What worked reliably: do
  ready-up → poll-until-active (via an in-page loop checking
  `document.querySelectorAll('h1,h2,h3')` for zero visible headings,
  *inside the same script*, not a separate `sleep`-then-check) →
  debug-console grant → build, all as **one continuous `javascript_tool`
  call** per player, rather than spreading these steps across separate
  tool calls with reasoning in between. If you only need to prove a
  server-tick-driven mechanic (combat, healing, destruction) and don't
  need the specific player to survive, it's fine to let them die after
  their one required action — the structure/zombie state keeps updating
  and syncing regardless of player alive-state.
- **Placing two structures close together can silently upgrade instead of
  placing a second one.** `tryBuildOrUpgrade()` (`src/ui/shopUI.ts`) checks
  for an existing "occupant" near the target cell first; if found, it
  attempts to *upgrade* that occupant (costs `points`, not wood/stone)
  instead of placing something new — and silently no-ops if the player has
  0 points, which they will by default. Discovered when two placements
  offset by only ~60px from each other resulted in just one structure
  existing. Space test placements at least 100+ screen px apart (or check
  `__debugStructures`'s length after each placement) if you need several
  distinct structures near one spawn point.
- **The `requestAnimationFrame` shim can silently stop ticking partway
  through a session, even after being confirmed working** — hit this
  2026-07-22 testing the redesigned UI (after the main-merge): a fresh
  page load + shim install + full queue/ready/match-start flow completed
  normally, but a `requestAnimationFrame` call counter read back 0 over a
  500ms window right after — meaning the render loop (and therefore
  `camera.x/y`, which only updates inside it) had gone stale, so canvas
  clicks computed against `mouse.pos + camera` landed nowhere near where
  they visually appeared to. **Symptom to watch for**: canvas clicks that
  should obviously hit something (dead-on player/structure position)
  silently do nothing. Fix that worked: reload the tab fresh, reinstall
  the shim, and explicitly re-verify the counter increments (don't just
  trust that "it worked earlier this session" carries forward) before
  relying on any canvas-coordinate math again — this is a cheap check
  worth doing before *every* click-based UI test, not just the first one
  per session.
- **Zombie chase AI (see the corrected zombie-model entry above) makes
  match setup itself a race against the clock in a way it wasn't before
  2026-07-22.** Beyond the already-documented risk of a test character
  dying if left alone too long, a *build+click+build* sequence spread
  across several tool calls with real round-trip latency in between can
  easily run past the point where zombies converge and kill the test
  player — several attempts this session lost a freshly-placed test
  structure to zombie damage, or lost the player themselves, before a
  planned follow-up action (like opening a structure's inspector) could
  run. Budget for this: assume test characters may not survive more than
  a few real seconds unattended once a match goes active, and prefer
  proving server-side mechanics via a raw two-client WebSocket script
  (immune to all of the above — no canvas, no render loop, no zombies to
  outrun) when a live in-browser click-through keeps getting beaten by
  timing rather than revealing an actual code problem.
