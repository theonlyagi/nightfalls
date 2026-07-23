# M6 — Type-safety escapes (`as any`, untyped weapon field)

**Severity:** Medium
**Area:** type safety

## What's happening

- `'remotePlayer'` is not part of `Bullet.owner`'s union
  (`'player' | 'turret' | 'zombie'`, `src/types.ts:56`), so remote-player
  bullets are forced through with `as any` (7 `as any` occurrences across
  `src/`).
- `PlayerState.weapon` is `weapon?: string` on the server
  (`server/src/Room.ts:35`) but a strict `WeaponKind` union on the client —
  the wire boundary between them is untyped, and `onPlayers` casts it back
  with `(p as any).weapon as WeaponKind` (`src/net/matchSync.ts:208`).

## Why it matters

Every `as any` is a place the compiler stops helping — exactly the kind of
gap that let the `'remotePlayer'` bullet mis-attribution in C2 compile
cleanly. The untyped weapon field means a typo or protocol change won't be
caught at build time.

## Suggested direction

Add `'remotePlayer'` to the `Bullet.owner` union (or model remote bullets as
a distinct type) so the casts can be removed. Type the weapon field as
`WeaponKind` end to end, validating it once at the packet boundary.
