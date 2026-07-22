// Wraps the esbuild CLI invocation so WS_URL can be baked in from the
// environment at build time — client JS has no runtime process.env, so
// build time (via esbuild's `define`) is the only point a production
// WebSocket URL can be injected. Reading process.env here (Node) instead of
// shelling out with `--define:X="$VAR"` sidesteps quoting differences
// across bash/PowerShell/cmd.
//
// Usage: WS_URL=wss://night-falls.xyz npm run build   (bash)
//        $env:WS_URL="wss://night-falls.xyz"; npm run build   (PowerShell)
// Unset (plain `npm run build`, e.g. local dev) falls back to localhost —
// see the matching declare/fallback in src/constants.ts.
const esbuild = require('esbuild');

const wsUrl = process.env.WS_URL || 'ws://localhost:8081/ws';

esbuild.buildSync({
  entryPoints: ['src/game.ts'],
  bundle: true,
  outfile: 'public/game.js',
  target: 'es2020',
  define: { __WS_URL__: JSON.stringify(wsUrl) },
});

console.log(`public/game.js (WS_URL=${wsUrl})`);
