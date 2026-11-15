/**
 * Checks the preview password gate against a running Pages dev server or a
 * live deployment.
 *   SITE_URL=https://idaho-gate.pages.dev SITE_PASSWORD=... npm run test:gate
 * Default target is http://127.0.0.1:4321 with the password "test-pass".
 */
const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const password = process.env.SITE_PASSWORD || 'test-pass';
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const get = (path, headers = {}) => fetch(base + path, { headers, redirect: 'manual' });

(async () => {
  const html = { accept: 'text/html' };
  let r = await get('/', html);
  let body = await r.text();
  check('home page is blocked without the password', r.status === 401 && body.includes('Private preview') && !body.includes('Built to'), `status ${r.status}`);
  check('blocked response tells search engines not to index', (r.headers.get('x-robots-tag') || '').includes('noindex'));
  r = await get('/gates/driveway-gates/', html);
  check('inner pages are blocked', r.status === 401);
  r = await get('/fonts/archivo-var.woff2');
  check('fonts and other assets are blocked', r.status === 401, `status ${r.status}`);
  r = await get('/sitemap-index.xml');
  check('sitemap is blocked', r.status === 401);
  r = await fetch(base + '/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  check('lead API is blocked', r.status === 401, `status ${r.status}`);

  const post = (pw, next = '/gates/') => fetch(base + '/__preview', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: pw, next }) });
  r = await post('wrong-password');
  check('wrong password is rejected', r.status === 401 && !r.headers.get('set-cookie'), `status ${r.status}`);
  r = await post(password);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  check('right password signs in and redirects back', r.status === 303 && r.headers.get('location') === '/gates/' && cookie.startsWith('igc_preview='), `status ${r.status}`);
  check('cookie is HttpOnly and Secure', /HttpOnly/i.test(r.headers.get('set-cookie') || '') && /Secure/i.test(r.headers.get('set-cookie') || ''));
  r = await post(password, '//evil.example');
  check('redirect target cannot leave the site', r.headers.get('location') === '/');

  r = await get('/', { ...html, cookie });
  body = await r.text();
  check('signed-in visitor sees the real home page', r.status === 200 && body.includes('Built to'), `status ${r.status}`);
  check('signed-in pages still say noindex', (r.headers.get('x-robots-tag') || '').includes('noindex'));
  r = await get('/fonts/archivo-var.woff2', { cookie });
  check('signed-in visitor gets assets', r.status === 200);
  r = await get('/', { ...html, cookie: 'igc_preview=deadbeef' });
  check('a forged cookie is rejected', r.status === 401);
  r = await fetch(base + '/api/lead', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{}' });
  check('signed-in visitor reaches the lead API', r.status === 422, `status ${r.status}`);

  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
