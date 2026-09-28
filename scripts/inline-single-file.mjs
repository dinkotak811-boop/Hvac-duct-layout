/**
 * Inlines the `dist-single` build (one JS chunk + one CSS file) into a single
 * self-contained HTML file that works offline from the filesystem (file://),
 * e.g. opened directly on a phone. No server, no network needed.
 */
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const DIST = 'dist-single';
const OUT = 'aeroduct-standalone.html';

const assets = readdirSync(join(DIST, 'assets'));
const jsFile = assets.find(f => f.endsWith('.js'));
const cssFile = assets.find(f => f.endsWith('.css'));
if (!jsFile) throw new Error('No JS bundle found in dist-single/assets');

const js = readFileSync(join(DIST, 'assets', jsFile), 'utf8');
const css = cssFile ? readFileSync(join(DIST, 'assets', cssFile), 'utf8') : '';

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// Drop the emitted <link>/<script> tags, then inline their content.
html = html
  .replace(/\s*<link[^>]+rel="stylesheet"[^>]*>/g, '')
  .replace(/\s*<link[^>]+rel="modulepreload"[^>]*>/g, '')
  .replace(/\s*<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');

const safeJs = js.replace(/<\/script>/gi, '<\\/script>');

// NOTE: use function replacements — `$&`, `$'` etc. inside minified JS/CSS
// would otherwise be interpreted as replacement patterns and corrupt the output.
html = html
  .replace('</head>', () => `  <style>\n${css}\n  </style>\n  </head>`)
  .replace('</body>', () => `  <script type="module">\n${safeJs}\n  </script>\n</body>`);

writeFileSync(OUT, html);
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`✓ ${OUT} written (${mb} MB, fully offline single file)`);
