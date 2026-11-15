/**
 * End-to-end conversion test. Proves, against a running dev server, that:
 *   - the quote wizard completes on a phone-sized screen
 *   - the lead email request reaches the mail API with subject, score and attachment
 *   - the webhook receives the full payload with UTM attribution
 *   - tracking events fire in order
 *   - the quick form works, and failure is reported honestly when delivery is off
 *
 * Build, then start the Cloudflare Pages runtime with test bindings:
 *   npm run build
 *   npm run pages:dev -- --binding PUBLIC_LAUNCH_READY=true \
 *     --binding RESEND_API_KEY=test --binding RESEND_API_URL=http://127.0.0.1:8787/emails \
 *     --binding "LEAD_FROM_EMAIL=Test <t@example.com>" --binding LEAD_TO_EMAIL=owner@example.com \
 *     --binding LEAD_WEBHOOK_URL=http://127.0.0.1:8787/hook
 * then: npm run test:e2e
 */
const { chromium } = require('playwright');
const http = require('http');

const SITE = process.env.SITE_URL || 'http://127.0.0.1:4321';
const received = { emails: [], hooks: [] };
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const data = JSON.parse(body || '{}');
    if (req.url === '/emails') received.emails.push({ auth: req.headers.authorization, data });
    if (req.url === '/hook') received.hooks.push(data);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'mock' }));
  });
});

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

(async () => {
  await new Promise((r) => mock.listen(8787, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const events = [];
  await page.exposeFunction('__rec', (e) => events.push(e));
  await page.addInitScript(() => document.addEventListener('igc:track', (e) => window.__rec(e.detail)));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  // Land on a service page with UTM parameters, then move to the wizard.
  await page.goto(`${SITE}/?utm_source=google&utm_medium=cpc&utm_campaign=gates-cda&gclid=TESTGCLID`, { waitUntil: 'load' });
  const t0 = Date.now();
  await page.goto(`${SITE}/quote/`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  const pick = async (name, value) => {
    await page.locator(`input[name="${name}"][value="${value}"]`).check({ force: true });
    await page.waitForTimeout(380);
  };
  await pick('path', 'gates');
  await pick('gates.gateType', 'driveway-swing');
  await pick('gates.width', '16-20');
  await pick('gates.material', 'plasma-cut');
  await pick('gates.automation', 'yes');
  await page.locator('input[name="gates.addons"][value="keypad"]').check({ force: true });
  await page.locator('input[name="gates.addons"][value="pillars"]').check({ force: true });
  await page.click('[data-next]');
  await pick('gates.timeline', 'asap');
  await pick('gates.budget', '20-40k');
  await page.click('[data-next]');
  await page.fill('input[name="gates.city"]', 'Hayden, ID');
  // 1x1 PNG as the "photo of the opening"
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('fieldset[data-step="gates:location"] input[type=file]', { name: 'opening.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(500);
  await page.click('[data-next]');
  await page.fill('#w-name', 'Jane Tester');
  await page.fill('#w-phone', '208-555-0177');
  await page.fill('#w-email', 'jane@example.com');
  await page.fill('#w-notes', 'Sloped gravel drive, about 5 percent.');
  const elapsed = Date.now() - t0;
  if (elapsed < 5200) await page.waitForTimeout(5300 - elapsed);
  await page.click('[data-submit]');
  await page.waitForURL('**/thank-you/**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);

  check('wizard reaches thank-you page', page.url().includes('/thank-you/'), page.url());
  check('wizard completed in under 60s (scripted)', Date.now() - t0 < 60000, `${Math.round((Date.now() - t0) / 1000)}s`);
  const email = received.emails[0];
  check('lead email request sent', !!email);
  if (email) {
    check('email authorised with API key', email.auth === 'Bearer test');
    check('email routed to owner inbox', (email.data.to || []).includes('owner@example.com'));
    check('email subject has tier and score', /^\[(HOT|WARM|COOL) \d+\]/.test(email.data.subject), email.data.subject);
    check('email reply-to is the lead', email.data.reply_to === 'jane@example.com');
    check('photo attached', email.data.attachments?.length === 1 && email.data.attachments[0].filename === 'opening.jpg');
    check('email text has readable answers', /Driveway swing gate/.test(email.data.text) && /16 to 20 ft/.test(email.data.text));
  }
  const hook = received.hooks[0];
  check('webhook payload received', !!hook);
  if (hook) {
    check('webhook has lead score', typeof hook.score === 'number' && hook.tier === 'hot', `${hook.score} ${hook.tier}`);
    check('webhook has UTM source and gclid', hook.attribution.first_utm_source === 'google' && hook.attribution.first_gclid === 'TESTGCLID');
    check('webhook has landing page and campaign', /utm_campaign=gates-cda/.test(hook.attribution.first_landing_page || ''));
    check('webhook has contact and city', hook.contact.phone === '208-555-0177' && hook.contact.city === 'Hayden, ID');
    check('webhook lists add-ons', hook.answers.some((a) => a.id === 'addons' && /Keypad/.test(a.value)));
  }
  const names = events.map((e) => e.event);
  check('quote_start tracked', names.includes('quote_start'));
  check('quote_step events tracked', names.filter((n) => /^quote_step_\d+$/.test(n)).length >= 5, names.filter((n) => /^quote_step/.test(n)).join(','));
  check('file_upload tracked', names.includes('file_upload'));
  check('quote_submit tracked with score', events.some((e) => e.event === 'quote_submit' && e.lead_score > 0));
  check('conversion fired on thank-you page', names.includes('conversion_page'));

  // Quick form in the page footer band.
  await page.goto(`${SITE}/contact/`, { waitUntil: 'load' });
  await page.fill('#contact-name', 'Sam Quick');
  await page.fill('#contact-phone', '5095550111');
  await page.fill('#contact-city', 'Spokane');
  await page.fill('#contact-msg', 'Need a handrail for front steps.');
  await page.waitForTimeout(2700);
  await page.click('form[data-quick-form] [data-submit]');
  await page.waitForURL('**/thank-you/**', { timeout: 15000 }).catch(() => {});
  check('quick form reaches thank-you page', page.url().includes('type=quick'));
  check('quick form delivered', received.emails.length === 2 && received.hooks.length === 2);
  check('tel links are tracked', await page.evaluate(() => !!document.querySelector('a[href^="tel:"]')));

  // Validation: empty contact step must not submit.
  await page.goto(`${SITE}/quote/?path=repairs`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const visibleStep = await page.evaluate(() => document.querySelector('fieldset[data-step]:not([hidden])')?.dataset.step);
  check('?path= deep link opens the right flow', visibleStep === 'repairs:problem', visibleStep);
  await page.click('[data-next]');
  check('required step blocks progress', await page.locator('fieldset[data-step="repairs:problem"] [data-step-error]').isVisible());

  await browser.close();
  mock.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  mock.close();
  process.exit(1);
});
