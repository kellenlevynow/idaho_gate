/**
 * Static audit of the production build in dist/. Run after `npm run build`:
 *   npm run audit
 * Checks every page for: one h1, title and description present and within
 * length, canonical, valid JSON-LD, images with alt text, and that every
 * internal link and asset reference resolves to a file.
 */
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const pages = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => {
  const p = path.join(d, f.name);
  if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) pages.push(p);
});
walk(dist);
let problems = 0;
const say = (page, msg) => { problems++; console.log(`${page}: ${msg}`); };
const exists = (url) => {
  const clean = decodeURI(url.split('#')[0].split('?')[0]);
  if (clean === '' ) return true;
  const p = path.join(dist, clean);
  return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html')));
};
const titles = new Map(), descs = new Map();
let links = 0, schemas = 0, images = 0;
for (const file of pages) {
  const rel = '/' + path.relative(dist, file).replace(/index\.html$/, '');
  const html = fs.readFileSync(file, 'utf8');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) say(rel, `${h1} h1 elements`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const t = title.replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  if (!t) say(rel, 'missing title'); else if (t.length > 60) say(rel, `title ${t.length} chars: ${t}`);
  if (titles.has(t)) say(rel, `duplicate title with ${titles.get(t)}`); titles.set(t, rel);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!desc) say(rel, 'missing description'); else if (desc.replace(/&#39;/g, "'").length > 155) say(rel, `description ${desc.length} chars`);
  if (descs.has(desc)) say(rel, `duplicate description with ${descs.get(desc)}`); descs.set(desc, rel);
  if (!/<link rel="canonical" href="https:\/\/idahogate\.com\//.test(html)) say(rel, 'missing canonical');
  if (!/<html lang="en-US"/.test(html)) say(rel, 'missing lang');
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); schemas++; } catch { say(rel, 'invalid JSON-LD'); }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    images++;
    if (!/\salt(=|\s|>)/.test(m[0])) say(rel, `img without alt: ${m[0].slice(0, 80)}`);
  }
  for (const m of html.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) {
    const url = m[1];
    if (url.startsWith('//') || url.startsWith('/api/')) continue;
    links++;
    if (!exists(url)) say(rel, `broken reference ${url}`);
  }
  if (/[—–]/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) say(rel, 'em or en dash in output');
  if (/\[\[[A-Z_ ]+\]\]/.test(html)) say(rel, 'placeholder token in output');
}
console.log(`${pages.length} pages, ${links} internal references, ${schemas} JSON-LD blocks, ${images} images checked`);
console.log(problems ? `${problems} problem(s)` : 'Static audit passed');
process.exit(problems ? 1 : 0);
