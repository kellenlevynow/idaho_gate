# Idaho Gate Co. website

Lead-generation site for a custom gate and metal fabrication company in North Idaho. 81 static pages, a scroll-driven 3D gate on the homepage, an interactive gate studio, a four-path quote wizard and a lead endpoint that emails every enquiry and can post it to a CRM.

Every image on the site is generated from the site's own code. There are no photographs.

## Stack

| Part | Choice | Why |
|---|---|---|
| Framework | [Astro](https://astro.build) 7, static output | Ships HTML. JavaScript only where a page needs it |
| Styling | Tailwind CSS 4 plus a small design system in `src/styles/global.css` | Tokens and components in one file |
| Content | Markdown content collections | Add a page by adding a file |
| 3D | three.js, loaded lazily | Real geometry for the homepage theater and the gate studio |
| Drawings | SVG generated at build time | Elevations, plans and fabrication drawings with no client script |
| Forms | One Cloudflare Pages Function, `/api/lead` | Email through Resend, optional webhook |
| Hosting | Cloudflare Pages | Static files on the CDN, two small functions |
| Preview protection | Pages middleware, `functions/_middleware.ts` | The whole site sits behind a password until launch |

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:4321. `astro dev` serves the pages only. The forms post to a Cloudflare Pages Function, so to exercise them locally build the site and run it under the Pages runtime:

```bash
npm run build
```

```bash
npm run pages:dev -- --binding PUBLIC_LAUNCH_READY=true
```

Without lead delivery configured the quote form reports "not connected", which is the intended behavior.

Output from `npm run build` goes to `dist/`.

### Other commands

| Command | What it does |
|---|---|
| `npm run check` | TypeScript and Astro diagnostics |
| `npm run check:content` | Title and description length, dash and placeholder lint |
| `npm run test:e2e` | End-to-end conversion test (needs the Pages dev server running with test bindings, see the top of `scripts/e2e.cjs`) |
| `npm run test:gate` | Checks the preview password gate against a local or live deployment |
| `npm run pages:dev` | Serve `dist/` with the Cloudflare Pages runtime, functions included |
| `npm run audit` | Static audit of `dist/`: one h1, titles, descriptions, canonicals, JSON-LD, alt text and every internal link |
| `npm run test:a11y` | Browser checks against a served build: phone overflow, thumb-reach CTAs, keyboard use, reduced motion, no JavaScript |
| `npm run render:stills` | Re-render the homepage theater fallback stills from the live 3D scene |
| `npm run render:presets` | Re-render every concept gate image from the studio scene |

The two render commands need the dev server running and Playwright with Chromium installed. `npm run test:a11y` expects the build served without the password gate at http://127.0.0.1:4400, for example with `npx serve dist -l 4400`.

Astro 7 runs the dev server as a background process. Stop it with `npx astro dev stop`.

## Private preview and public release

The site is deployed behind a password. `functions/_middleware.ts` runs before every request, including images, scripts, the sitemap and the lead API.

| Setting | Where | Effect |
|---|---|---|
| `SITE_PASSWORD` | Cloudflare Pages secret | The password visitors type on the preview screen |
| `PUBLIC_LAUNCH_READY` | Cloudflare Pages variable | `true` opens the site to the public |

Behavior while `PUBLIC_LAUNCH_READY` is not `true`:

- Every request needs the password. A signed-in browser keeps a cookie for 30 days. Visit `/__preview?logout` to sign out.
- Every response carries `X-Robots-Tag: noindex`, every page has a `noindex` meta tag and `robots.txt` disallows everything.
- If `SITE_PASSWORD` is missing the site returns 503 instead of opening. It fails closed.

To change the password, edit the `SITE_PASSWORD` secret on the Pages project (Settings, Variables and Secrets), then retry the latest deployment so the new value takes effect.

### Releasing to the public

1. Fill in the real phone, email and hours in **`src/site.config.ts`**. See `TODO-CONTENT.md` for the full list.
2. Configure lead delivery (next section) and send yourself a real quote request from the preview.
3. In the Cloudflare dashboard, open the `idaho-gate` Pages project, go to Settings, Variables and Secrets, and add `PUBLIC_LAUNCH_READY` = `true` for Production.
4. Retry the latest deployment (Deployments, the three dots, Retry deployment). The rebuild drops the `noindex` tags, opens `robots.txt`, removes the password gate and limits functions to `/api/*`.
5. Add `idahogate.com` as a custom domain on the Pages project.

To go back to private, delete that variable and retry the deployment.

## Lead delivery

Set these as secrets on the Cloudflare Pages project (Settings, Variables and Secrets), then retry the latest deployment. Never commit them.

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | For email | API key from [resend.com](https://resend.com) |
| `LEAD_FROM_EMAIL` | For email | A sender on a domain verified in Resend, for example `Idaho Gate Co. <quotes@idahogate.com>` |
| `LEAD_TO_EMAIL` | For email | Where leads go. Comma-separate several inboxes |
| `LEAD_TO_EMAIL_GATES` / `_FABRICATION` / `_COMMERCIAL` / `_REPAIRS` | No | Route an enquiry path to its own inbox |
| `LEAD_WEBHOOK_URL` | No | CRM, Zapier or Make endpoint. Receives the full lead as JSON |
| `LEAD_WEBHOOK_SECRET` | No | Sent as the `X-Lead-Secret` header |

How it behaves:

- A lead is accepted only if **at least one** channel (email or webhook) confirms delivery. Otherwise the visitor sees a clear error with the phone number and their answers are kept. The thank-you page can never be reached by a lead nobody received.
- Every lead gets a score from 0 to 100 and a tier (hot, warm, cool) from timeline, automation, opening width, budget, urgency and attachments. The tier and score lead the email subject, for example `[HOT 94] Custom gate · Driveway swing gate · Hayden, ID (Jane T.)`.
- Photos are downscaled in the browser and sent as email attachments.
- Spam protection is a honeypot field plus a minimum time-to-submit. No CAPTCHA.
- The email's reply-to is the customer, so you can answer straight from your inbox.

For local testing, pass values to the Pages runtime with `--binding NAME=value` or a `.dev.vars` file (ignored by git). `scripts/e2e.cjs` shows a full example with a mock mail API and webhook.

## Tracking

All tracking goes through one file, `src/scripts/tracking.ts`, which lists every event. Nothing loads until an ID is set.

| Variable | Loads |
|---|---|
| `PUBLIC_GTM_ID` | Google Tag Manager. When set, GTM owns GA4, Ads and Meta tags and the site only pushes to `dataLayer` |
| `PUBLIC_GA4_ID` | GA4 directly (when not using GTM) |
| `PUBLIC_GOOGLE_ADS_ID`, `PUBLIC_GOOGLE_ADS_LEAD_LABEL`, `PUBLIC_GOOGLE_ADS_CALL_LABEL` | Google Ads conversions for quote submits and call clicks |
| `PUBLIC_META_PIXEL_ID` | Meta Pixel |
| `PUBLIC_CALL_TRACKING_SCRIPT` | A call-tracking number swap script |

Events: `call_click`, `email_click`, `cta_click`, `quote_start`, `quote_step_n`, `quote_submit`, `form_submit`, `form_error`, `file_upload`, `studio_configure`, `hero_stage`, `conversion_page`.

Attribution (`src/scripts/attribution.ts`) stores first-touch and last-touch UTM parameters, `gclid`, `fbclid`, `msclkid`, landing page, referrer and the last service page viewed, and sends them with every lead.

## Deploying to Cloudflare Pages

The Cloudflare Pages project `idaho-gate` is connected to this GitHub repository. Cloudflare builds and deploys on every push to the production branch. There is nothing to run by hand.

| Setting | Value |
|---|---|
| Preview URL | https://idaho-gate.pages.dev |
| Production branch | `claude/affectionate-cerf-90gz6o` (change it under Settings, Builds, if you move work to `main`) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22 (`.node-version` and the `NODE_VERSION` variable) |
| Functions | `functions/` is picked up automatically |

Variables and secrets live on the Pages project under Settings, Variables and Secrets. They apply to both the build and the running functions, so `PUBLIC_*` values set there are baked into the pages on the next deployment.

`public/_headers` sets caching and security headers. `public/_redirects` maps the old Squarespace paths from `idahofortifiedgate.com` to the new pages. If you still control that domain, add it to the Pages project so those 301s carry over its search equity.

To check the password gate on the live site:

```bash
SITE_URL=https://idaho-gate.pages.dev SITE_PASSWORD='your password' npm run test:gate
```

## Project layout

```
src/
  site.config.ts          Brand, contact, service towns, tracking. The one file to edit first
  content.config.ts       Content collection schemas
  content/
    services/<division>/  23 service pages (gates, automation, fabrication)
    industries/           6 pages
    guides/               11 guides
    areas/                11 local and regional pages
    concepts/             8 concept studies
  data/
    nav.ts                Divisions and navigation. Add or disable a business line here
    quote-flow.ts         Quote wizard questions for all four paths
    gate-presets.ts       Named concept gates used by drawings and renders
  lib/
    gate-model.ts         Parametric gate model shared by 3D and SVG
    drawing.ts            Elevation and plan drawing generator
    fab-drawings.ts       Fabrication concept drawings
    lead.ts               Lead validation and scoring (shared by browser and server)
    lead-handler.ts       The /api/lead request handler
    lead-server.ts        Email and webhook delivery
    schema.ts             JSON-LD builders
  three/
    stage.ts              Materials, finishes, mesh builder
    hero.ts               Homepage scroll theater
    studio.ts             Gate studio viewer
  scripts/                Browser scripts: tracking, attribution, wizard, theater, studio
  components/             Shared UI
  layouts/                Base and Legal layouts
  pages/                  Routes
functions/
  _middleware.ts          Preview password gate (runs before every request)
  api/lead.ts             Lead endpoint wrapper
docs/
  BUSINESS-LINE-STRATEGY.md
  SEO-AND-CONTENT-STRATEGY.md
reference/                Original brief and old-site screenshots (not used by the site)
scripts/                  Render pipeline, end-to-end test, content lint
TODO-CONTENT.md           Everything the owner needs to supply
```

## Common changes

**Add a service page.** Create a Markdown file in `src/content/services/<division>/` with the same front matter as its neighbors. It appears in the menu, footer, hub page and sitemap.

**Add a business line.** Add an entry to `divisions` in `src/data/nav.ts`, add its slug to the `division` enum in `src/content.config.ts`, and create a folder of Markdown files. To retire a line, set `enabled: false`.

**Add a town.** Add it to `serviceTowns` in `src/site.config.ts`. It appears on the map and in the lists. Add a Markdown file in `src/content/areas/` only if you have something specific to say about it.

**Add a gate design.** Add a preset to `src/data/gate-presets.ts` and `scripts/presets.json`, then run `npm run render:presets`. Reference it from a page's `visual` front matter.

**Change the 3D gate.** Geometry lives in `src/lib/gate-model.ts`. The scroll sequence, camera path and lighting live in `src/three/hero.ts`. After changing either, run `npm run render:stills` so the fallback images match.

## How the homepage 3D degrades

1. **No JavaScript or reduced motion:** six stacked sections with rendered stills.
2. **JavaScript without WebGL, or data saver on:** the sticky theater runs with stills that change by scroll position.
3. **WebGL:** the live scene replaces the stills once its first frame is drawn. Resolution drops automatically on devices that cannot hold frame rate.

The choice is made before first paint, so the layout never shifts.

## Accessibility

- Semantic landmarks, one `h1` per page, a skip link and visible focus styles.
- The quote wizard is native radio and checkbox inputs in fieldsets and works by keyboard.
- The mobile menu, mega menu, tabs and filters expose their state with ARIA attributes.
- Drawings have accessible names. Decorative drawings are hidden from assistive technology.
- Motion respects `prefers-reduced-motion`.
- Colors were checked for WCAG AA contrast.
