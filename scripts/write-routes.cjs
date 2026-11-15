/**
 * Writes dist/_routes.json, which tells Cloudflare Pages which requests run
 * through Functions.
 *   Preview (default): every request, so the password gate covers the whole site.
 *   Launched (PUBLIC_LAUNCH_READY=true): only /api/*, so pages and assets are
 *   served straight from the CDN without invoking a function.
 */
const fs = require('fs');
const path = require('path');
const launched = process.env.PUBLIC_LAUNCH_READY === 'true';
const routes = launched
  ? { version: 1, include: ['/api/*'], exclude: [] }
  : { version: 1, include: ['/*'], exclude: [] };
fs.writeFileSync(path.join(__dirname, '..', 'dist', '_routes.json'), JSON.stringify(routes, null, 2) + '\n');
console.log(`_routes.json: ${launched ? 'public release, functions on /api/* only' : 'private preview, password gate on every request'}`);
