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
- Client build now uses **esbuild** (`npm run build` → bundles `src/game.ts`
  into `public/game.js`), not raw `tsc`. `src/` is split into
  `constants.ts`, `game.ts`, `render/`, `state.ts`, `systems/`, `ui/`,
  `utils.ts` (a teammate's refactor — the very old monolithic
  single-file `game.ts` is gone).
- Debug/cheat console: press **Home** in-game, password **`agi123`**. It's a
  local testing tool, not a real security gate (says so on the panel itself).

## ⚠️ Outstanding: multiplayer is mid-build, NOT connected to the game yet

The user wants multiplayer released soon (originally framed as a ~24h
target, then relaxed once it was clear a VPS/domain weren't even acquired
yet — **don't assume the deadline is still literal**, confirm with the user).
Current state, precisely:

**What exists (`server/`, a standalone Node/TypeScript/uWebSockets.js
backend, AGPL-3.0 licensed — see `server/NOTICE.md` for why):**
- `server/src/protocol.ts` — shared packet types/constants, `PROTOCOL_VERSION`.
- `server/src/Room.ts` — one isolated match (max 4 players): player state
  (position/hp/xp/level), zombies (server-spawned wander AI), bullets,
  bullet-vs-zombie and zombie-vs-player collision, XP/leveling on kill.
- `server/src/RoomManager.ts` — assigns joins to a room with space or creates
  one; destroys empty rooms; `SessionStore` holds a disconnected player's
  state for 30s so a reconnect (via `?token=...` on the WS URL) resumes the
  *same* player instead of respawning as a stranger.
- `server/src/index.ts` — uWS app: origin allowlist (`ALLOWED_ORIGINS` env,
  currently defaults to `http://localhost:8080` only — **must be updated for
  any real deployment**), move/shoot validation (anti-teleport speed check,
  fire-rate limit), ties it all together.
- All of the above verified with real test clients (multi-room isolation,
  validation rejection, reconnection, collision→XP chain) — see git history
  on the `multiplayer-server-foundation` branch/PR for the exact test
  transcripts if you need to re-verify behavior.

**What's explicitly NOT done — this is the real gap, not just polish:**
1. **The game client has zero networking code.** `public/game.js` /
   `src/game.ts` never opens a WebSocket. The existing "Team Mode" lobby UI
   in the client is a **local-only stub** (search `Team lobby (local stub`
   or similar) — it doesn't talk to `server/` at all. This is the largest
   remaining piece of work: wiring the client to connect, send its own
   moves/shots, and render the *other* synced players/zombies/bullets it
   receives back, while reconciling against the client's existing full
   local simulation (which currently runs regardless of mode).
2. **Not deployed anywhere.** `server/` has only run on `localhost:8081` on
   the dev machine. No VPS, no domain, no TLS/`wss://`, no process manager
   (pm2/systemd), no production `ALLOWED_ORIGINS`. User plans to get a VPS
   "tomorrow" (relative to when this was written) — confirm current status
   before assuming it still hasn't happened.
3. **Structures, day/night, Blood Moon, shop, and evolutions/mutations are
   NOT synced.** Only player position, zombies, and bullets are. If two
   players joined a real session today, they'd see different day/night
   states and neither would see the other's walls/turrets — this would look
   broken, not just incomplete, if shipped as-is. Structures + day/night
   sync should be treated as required-before-real-launch, not optional
   polish; shop/evolutions can more reasonably wait for a v2 (they also
   still have open design questions — what's even purchasable/choosable in
   a synced multiplayer context was never resolved).

**Recommended next step for whoever picks this up:** scope a deliberately
minimal multiplayer v1 (synced position/zombies/bullets/combat only,
explicitly without structures/shop/evolutions) rather than attempting full
feature parity — that's what's actually achievable quickly given the gap
above. Confirm this scoping with the user before assuming it still holds.

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
