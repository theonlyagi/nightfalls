# License notice — this directory only

Everything under `server/` is licensed under the **GNU Affero General
Public License v3.0** (see [LICENSE](LICENSE)) — separately from the rest
of this repository, which remains proprietary (see the root
[LICENSE.txt](../LICENSE.txt)).

This split is intentional: the game client and the multiplayer server are
independent programs that communicate only over a network protocol
(WebSocket messages). They are not statically combined into one program,
so each side may carry its own license.

## Why AGPL

This server is built with reference to
[ABCxFF/diepcustom](https://github.com/ABCxFF/diepcustom), an AGPL-3.0
licensed diep.io private-server template, and to
[uNetworking/uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)
(also used by diepcustom for its transport layer). Any code in `server/`
adapted or derived from that project — and this directory as a combined
work — is therefore licensed AGPL-3.0, matching the upstream project's
terms.

## What this obligates us to do

AGPL-3.0 §13 requires that anyone interacting with this server **remotely
over a network** must be able to obtain the complete corresponding source
code of the version they're interacting with, at no charge.

In practice, for this project:

- The `server/` directory's source must be kept in a **publicly
  accessible** location (a public GitHub repo, or a public mirror of this
  directory) whenever the server is running live and accepting
  connections.
- The deployed server should expose that source location to connecting
  clients — e.g. a `/source` HTTP endpoint or an in-game "source" link —
  pointing at the public repo/commit currently running.
- Any modifications made here must stay under AGPL-3.0; we cannot
  relicense or close-source this directory while it depends on
  AGPL-licensed code.

This is general compliance guidance, not legal advice — if this project
grows into something commercially significant, get a real license review
before relying on this note alone.
