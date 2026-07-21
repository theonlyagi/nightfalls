"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Bundles public/index.html + public/styles.css + public/game.js into a single
// distributable, obfuscated HTML file at docs/index.html, plus a copy of the
// root LICENSE.txt alongside it. Run `npm run build` first so public/game.js
// is current.
//
// docs/ is deliberately named that (not e.g. dist-share/) because it's GitHub
// Pages' native "deploy from branch: main, /docs" convention — point Pages at
// this folder and it serves ONLY what's in here, never src/, scripts/, or
// public/. That's what keeps the published game separate from the source.
//
// Compiled to build-share.js by `npm run build:scripts` (see scripts/tsconfig.json)
// — that compiled output is what actually runs, same pattern as src/game.ts ->
// public/game.js.
const fs = require("fs");
const path = require("path");
const terser_1 = require("terser");
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'docs');
async function main() {
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    const rawCss = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
    const devJs = fs.readFileSync(path.join(publicDir, 'game.js'), 'utf8');
    const license = fs.readFileSync(path.join(root, 'LICENSE.txt'), 'utf8');
    // Inline the menu background image as a data URI — the bundle is a single
    // standalone file, so it can't reference public/menu-bg.jpg by path like the
    // dev version does.
    const menuBgBase64 = fs.readFileSync(path.join(publicDir, 'menu-bg.jpg')).toString('base64');
    const css = rawCss.replace("url('menu-bg.jpg')", () => `url('data:image/jpeg;base64,${menuBgBase64}')`);
    // The published bundle ships minified + name-mangled, not the readable dev build —
    // this is a deterrent against casual view-source copying, not real protection:
    // client-side JS can always be deobfuscated by anyone determined enough. Only
    // variable/function names are mangled (not object properties), since object keys
    // here (ZTYPE, BUILD_DEFS, etc.) are just data, never referenced by mangled names.
    const result = await (0, terser_1.minify)(devJs, { compress: true, mangle: true });
    if (!result.code)
        throw new Error('terser produced no output');
    const js = result.code;
    const licenseComment = `<!-- NIGHTFALL.IO — (c) 2026. All rights reserved. Unauthorized copying, redistribution, or reuse of this source is prohibited without permission. -->\n`;
    const bundled = html
        // Drop the Google Fonts <link> tags: an external stylesheet link makes browsers
        // delay running any <script> that follows it until that stylesheet finishes
        // loading. On a network that can't reach fonts.googleapis.com (offline, a
        // firewall, a flaky connection), that hangs the whole game before it starts —
        // it just sits there "loading" forever. The distributable needs to be truly
        // zero-dependency, so it falls back to the CSS's built-in sans-serif/monospace
        // fallbacks instead.
        .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/, '\n')
        .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^"]*" rel="stylesheet">\n/, '\n')
        // Replacement is a function, not a string, in each of these three: a string
        // replacement has $-sequences special-cased ($&, $`, $', $$), and both the dev
        // JS (a literal `$'` from ctx.fillText('$', ...) for the shop icon) and terser's
        // minified/mangled output (which can legally produce single-character or
        // $-containing identifiers) can trigger this. A function return value is
        // inserted verbatim, no $ handling.
        .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}</style>`)
        .replace('<script src="game.js"></script>', () => `<script>\n${js}\n</script>`)
        .replace('<head>', () => `<head>\n${licenseComment}`);
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), bundled);
    fs.writeFileSync(path.join(distDir, 'LICENSE.txt'), license);
    const assetsSrc = path.join(publicDir, 'assets');
    const assetsDst = path.join(distDir, 'assets');
    if (fs.existsSync(assetsSrc)) {
        fs.cpSync(assetsSrc, assetsDst, { recursive: true });
    }
    console.log('Wrote docs/index.html + docs/LICENSE.txt + docs/assets/ (' + devJs.length + ' -> ' + js.length + ' bytes minified)');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
