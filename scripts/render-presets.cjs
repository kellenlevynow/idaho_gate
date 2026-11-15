/**
 * Renders concept images of every gate preset from the gate studio scene.
 * These are the "finished product renderings" used on service, project
 * and guide pages. Nothing here is a photograph.
 *
 *   1. npm run dev            (in another terminal)
 *   2. npm run render:presets
 *
 * Output: src/assets/renders/presets/<preset>.jpg (+ a few detail views)
 */
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const url = process.env.SITE_URL || 'http://127.0.0.1:4321/';
const outDir = path.join(__dirname, '..', 'src', 'assets', 'renders', 'presets');

// preset key -> [finish, yaw, pitch, zoom]
const shots = {
  'estate-ridgeline': ['matte-black', -24, 8, 1],
  'driveway-picket': ['matte-black', 22, 8, 1],
  'modern-slat': ['graphite', -26, 9, 1],
  'slide-slat': ['weathering', -20, 10, 1],
  'slide-commercial': ['galvanized', 18, 11, 1],
  'swing-single': ['dark-bronze', -28, 9, 1],
  'ranch-double': ['dark-bronze', 24, 8, 1],
  pedestrian: ['matte-black', -30, 8, 1],
  'privacy-plate': ['weathering', 26, 9, 1],
  'estate-pillars': ['matte-black', -18, 7, 1],
  'automated-swing': ['graphite', 150, 12, 1],
  'ranch-single': ['weathering', -24, 9, 1],
};
const extras = [
  { name: 'estate-ridgeline-exploded', preset: 'estate-ridgeline', finish: 'matte-black', yaw: 32, pitch: 14, zoom: 0.72, exploded: true },
  { name: 'estate-ridgeline-line', preset: 'estate-ridgeline', finish: 'matte-black', yaw: -24, pitch: 8, zoom: 1, drawing: true },
  { name: 'estate-ridgeline-open', preset: 'estate-ridgeline', finish: 'matte-black', yaw: -24, pitch: 8, zoom: 1, open: true },
  { name: 'slide-slat-open', preset: 'slide-slat', finish: 'weathering', yaw: -20, pitch: 10, zoom: 1, open: true },
  ...['matte-black', 'dark-bronze', 'weathering', 'galvanized', 'graphite'].map((f) => ({
    name: `finish-${f}`, preset: 'estate-ridgeline', finish: f, yaw: -32, pitch: 4, zoom: 3.4, w: 1200, h: 900,
  })),
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const presets = JSON.parse(fs.readFileSync(path.join(__dirname, 'presets.json'), 'utf8'));
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`${url}studio/?capture=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__studio, null, { timeout: 90000 });
  const render = async (name, state, w = 1600, h = 1000) => {
    const data = await page.evaluate(([s, w, h]) => window.__studio.renderStill(s, w, h), [state, w, h]);
    const file = path.join(outDir, `${name}.jpg`);
    await sharp(Buffer.from(data.split(',')[1], 'base64')).jpeg({ quality: 88, mozjpeg: true }).toFile(file);
    console.log('rendered', path.relative(process.cwd(), file));
  };
  for (const [key, [finish, yaw, pitch, zoom]] of Object.entries(shots)) {
    await render(key, { spec: presets[key], finish, yaw, pitch, zoom, exploded: false, open: false, drawing: false });
  }
  for (const e of extras) {
    await render(e.name, { spec: presets[e.preset], finish: e.finish, yaw: e.yaw, pitch: e.pitch, zoom: e.zoom, exploded: !!e.exploded, open: !!e.open, drawing: !!e.drawing }, e.w, e.h);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
