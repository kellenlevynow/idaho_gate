/**
 * Content lint. Run with: npm run check:content
 *   - title tags under 60 characters (before the brand suffix is considered)
 *   - meta descriptions under 155 characters
 *   - no em or en dashes in copy (house style)
 *   - no leftover [[PLACEHOLDER]] tokens outside TODO-CONTENT.md
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.astro', '.netlify', '.git', 'reference'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(md|astro|ts)$/.test(f.name)) out.push(p);
  }
  return out;
};
let problems = 0;
const say = (file, msg) => { problems++; console.log(`${path.relative(root, file)}: ${msg}`); };
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/[—–]/.test(text)) say(file, 'contains an em or en dash');
  if (/\[\[[A-Z_ ]+\]\]/.test(text)) say(file, 'contains a [[PLACEHOLDER]] token');
  const fields = file.endsWith('.md')
    ? [[/^seoTitle:\s*"?(.+?)"?\s*$/m, 60, 'seoTitle'], [/^description:\s*"?(.+?)"?\s*$/m, 155, 'description']]
    : [[/\btitle="([^"{]+)"/, 60, 'title'], [/\bdescription="([^"{]+)"/, 155, 'description']];
  for (const [re, max, name] of fields) {
    const m = text.match(re);
    if (m && m[1].length > max) say(file, `${name} is ${m[1].length} chars (max ${max}): ${m[1]}`);
  }
}
console.log(problems ? `\n${problems} problem(s)` : 'Content checks passed');
process.exit(problems ? 1 : 0);
