/**
 * Renders the fallback stills for the homepage gate theater from the live
 * 3D scene, so the static images always match the real-time experience.
 *
 *   1. npm run dev            (in another terminal)
 *   2. npm run render:stills
 *
 * Output: src/assets/renders/theater/<stage>-{land,port}.jpg
 * Requires Playwright with Chromium (WebGL via SwiftShader is fine).
 */
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const url = process.env.SITE_URL || 'http://127.0.0.1:4321/';
const outDir = path.join(__dirname, '..', 'src', 'assets', 'renders', 'theater');
const stages = { reveal: 0.0, drawing: 0.25, exploded: 0.47, materials: 0.66, reassembly: 0.85, opening: 0.94 };
const sizes = { land: [1920, 1080], port: [1080, 1920] };

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [orient, [w, h]] of Object.entries(sizes)) {
    // The page viewport matches the still so framing rules (portrait vs landscape) apply.
    const page = await browser.newPage({ viewport: { width: w / 2, height: h / 2 }, deviceScaleFactor: 1 });
    await page.goto(`${url}?capture=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__gate, null, { timeout: 90000 });
    for (const [stage, p] of Object.entries(stages)) {
      const data = await page.evaluate(([p, w, h]) => window.__gate.renderStill(p, w, h), [p, w, h]);
      const file = path.join(outDir, `${stage}-${orient}.jpg`);
      await sharp(Buffer.from(data.split(',')[1], 'base64')).jpeg({ quality: 88, mozjpeg: true }).toFile(file);
      console.log('rendered', path.relative(process.cwd(), file));
    }
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
