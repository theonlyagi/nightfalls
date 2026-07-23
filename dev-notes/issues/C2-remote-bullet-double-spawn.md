# C2 — Remote-player bullets double-spawned and mis-attributed

**Severity:** Critical
**Area:** multiplayer sync

## What's happening

A single shot from another player creates **two** bullets on your screen:

1. A client-predicted bullet from `net.onShoot`, tagged
   `owner: 'remotePlayer'` (`src/net/matchSync.ts:286-328`), and
2. The server's authoritative bullet for that shot, kept because `onBullets`
   filters `b.ownerId !== myId` (`src/net/matchSync.ts:262`) — and
   `toClientBullet` relabels it `owner: 'player'` (`src/net/matchSync.ts:169`).

## Why it matters

Two issues, both traced from static reading (worth reproducing live to
confirm exact in-game effect):

- **Visual**: two bullets render per remote shot.
- **Mis-attribution**: because the server bullet is relabeled `'player'` on
  your client, your local bullet loop runs it through the *local-player*
  collision path — so another player's bullet can trigger **your** vampire
  lifesteal and **your** local XP/level-ups (`src/systems/update.ts:359-366`).
  This feeds directly into the level-divergence problem in C1.

## Suggested direction

This is a direct consequence of C1's dual-simulation model. If the client
becomes a pure renderer for remote entities (server-authoritative bullets
only, no local `onShoot` prediction for other players' shots), the double
spawn and mis-attribution both disappear. If prediction for remote shots is
kept for smoothness, then the matching server bullet must be de-duplicated
(match by a shared id) and never relabeled `'player'`.
