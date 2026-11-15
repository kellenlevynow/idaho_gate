// Dev helper: screenshot the real page at theater scroll progress values.
// usage: node scripts/page-shot.cjs <outDir> <w> <h> <p1,p2,...> [url]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [outDir, w, h, ps, url = 'http://127.0.0.1:4321/?force3d=1'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__gate, null, { timeout: 60000 });
  for (const p of ps.split(',')) {
    await page.evaluate((p) => {
      const root = document.querySelector('[data-theater]');
      const total = root.offsetHeight - window.innerHeight;
      window.scrollTo(0, root.offsetTop + total * p);
      window.__gate.setProgress(+p, true);
    }, +p);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/page-${w}-p${p}.png` });
    console.log('saved', p);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
