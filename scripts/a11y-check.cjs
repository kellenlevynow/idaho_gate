/**
 * Browser checks against a served production build (default http://127.0.0.1:4400):
 *   - no horizontal overflow at phone width on every page
 *   - call and quote controls visible in the first screen on phones
 *   - keyboard: skip link, mega menu open/close with Escape, quote wizard by keyboard
 *   - reduced motion: homepage theater renders as static stacked sections
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.env.SITE_URL || 'http://127.0.0.1:4400';
const dist = path.join(__dirname, '..', 'dist');
const pages = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => {
  const p = path.join(d, f.name);
  if (f.isDirectory()) walk(p); else if (f.name === 'index.html') pages.push('/' + path.relative(dist, d).replace(/\\/g, '/') + (d === dist ? '' : '/'));
});
walk(dist);
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });

  // 1. phone-width overflow and thumb-reach CTAs on every page
  // Not using isMobile here: a mobile context widens the layout viewport to fit overflowing
  // content, which would hide exactly the problem this check looks for.
  const phone = await browser.newContext({ viewport: { width: 375, height: 700 }, hasTouch: true });
  const page = await phone.newPage();
  const overflow = [], noCta = [];
  for (const u of pages) {
    await page.goto(base + u.replace('//', '/'), { waitUntil: 'load' });
    const r = await page.evaluate(() => {
      const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      return {
        over: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
        tel: [...document.querySelectorAll('a[href^="tel:"]')].some(vis),
        quote: [...document.querySelectorAll('a[href^="/quote"], form[data-wizard-form], form[data-quick-form]')].some(vis),
      };
    });
    if (r.over > 1) overflow.push(`${u} +${r.over}px`);
    if (!r.tel || !r.quote) noCta.push(u);
  }
  check(`no horizontal overflow at 375px on ${pages.length} pages`, overflow.length === 0, overflow.slice(0, 6).join(', '));
  check('call and quote reachable in the first screen on every phone page', noCta.length === 0, noCta.slice(0, 6).join(', '));
  await phone.close();

  // 2. keyboard on desktop
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await desk.newPage();
  await p.goto(base + '/gates/driveway-gates/', { waitUntil: 'load' });
  await p.keyboard.press('Tab');
  const skip = await p.evaluate(() => document.activeElement?.className || '');
  check('first Tab lands on the skip link', skip.includes('skip-link'));
  await p.keyboard.press('Enter');
  check('skip link moves to main content', await p.evaluate(() => location.hash === '#main'));
  const trigger = p.locator('[data-menu-trigger]').first();
  await trigger.focus();
  await p.keyboard.press('Enter');
  check('mega menu opens from the keyboard', (await trigger.getAttribute('aria-expanded')) === 'true' && await p.locator('#menu-gates').isVisible());
  await p.keyboard.press('Tab');
  check('focus moves into the open menu', await p.evaluate(() => !!document.activeElement?.closest('#menu-gates')));
  await p.keyboard.press('Escape');
  check('Escape closes the menu and returns focus', (await trigger.getAttribute('aria-expanded')) === 'false' && await p.evaluate(() => document.activeElement?.hasAttribute('data-menu-trigger')));
  const focusRing = await p.evaluate(() => { const el = document.querySelector('.btn'); el.focus(); return getComputedStyle(el).outlineStyle; });
  check('buttons show a focus outline', focusRing !== 'none', focusRing);

  // wizard by keyboard only
  await p.goto(base + '/quote/', { waitUntil: 'load' });
  await p.waitForTimeout(300);
  await p.locator('input[name="path"]').first().focus();
  await p.keyboard.press('Space');
  await p.waitForTimeout(450);
  check('wizard: Space selects a path and advances', await p.locator('fieldset[data-step="gates:type"]').isVisible());
  check('wizard: focus moves to the new step heading', await p.evaluate(() => document.activeElement?.tagName === 'LEGEND'));
  await p.keyboard.press('Tab');
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(450);
  check('wizard: arrow keys choose an option and advance', await p.locator('fieldset[data-step="gates:size"]').isVisible());
  await p.locator('[data-back]').focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  check('wizard: Back works from the keyboard', await p.locator('fieldset[data-step="gates:type"]').isVisible());
  const labelled = await p.evaluate(() => [...document.querySelectorAll('#wizard input:not([type=hidden]):not([tabindex="-1"]), #wizard select, #wizard textarea')].filter((el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label')).length);
  check('wizard: every input has a label', labelled === 0, `${labelled} unlabeled`);
  await desk.close();

  // 3. reduced motion
  const rm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const q = await rm.newPage();
  await q.goto(base + '/', { waitUntil: 'load' });
  const r = await q.evaluate(() => ({
    live: document.documentElement.classList.contains('theater-live'),
    sticky: getComputedStyle(document.querySelector('.theater-sticky')).position,
    stages: [...document.querySelectorAll('.stage')].filter((s) => getComputedStyle(s).visibility === 'visible' && s.offsetHeight > 200).length,
    h1: !!document.querySelector('h1')?.offsetHeight,
  }));
  check('reduced motion: theater is static, all six stages stacked', !r.live && r.sticky !== 'sticky' && r.stages === 6 && r.h1, JSON.stringify(r));
  await rm.close();

  // 4. no JavaScript
  const nojs = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const n = await nojs.newPage();
  await n.goto(base + '/', { waitUntil: 'load' });
  const nj = await n.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim().slice(0, 30), tel: !!document.querySelector('a[href^="tel:"]'), stages: document.querySelectorAll('.stage').length }));
  check('no JavaScript: homepage content, headline and phone link render', !!nj.h1 && nj.tel && nj.stages === 6, JSON.stringify(nj));
  await n.goto(base + '/quote/', { waitUntil: 'load' });
  check('no JavaScript: quote page tells the visitor to call', (await n.locator('noscript').count()) > 0);
  await nojs.close();

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
