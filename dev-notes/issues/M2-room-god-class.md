# M2 — `Room.ts` is an 863-line god class

**Severity:** Medium
**Area:** complexity / separation of concerns

## What's happening

`server/src/Room.ts` is a single class (~28 methods) that owns lobby state,
countdown, world generation, zombie spawning, zombie physics, bullet physics,
collision resolution, structure combat, day/night, resource respawn,
team-defeat detection, and six near-identical `broadcast*` serializers
(`server/src/Room.ts:181-252`).

## Why it matters

Everything match-related lives in one file, so unrelated concerns collide in
every diff (this is part of why the C4 clobber was easy to miss). The
`broadcast*` methods are copy-paste `JSON.stringify` blocks — adding a new
entity type means adding yet another near-duplicate.

## Suggested direction

Decompose along the obvious seams, e.g. a `Lobby`/countdown unit, a
`Simulation` unit (spawning + physics + collision + day/night), and a
`Broadcaster` that replaces the six hand-written serializers with one generic
helper. No behavior change — purely structural, so it can be done
incrementally.
