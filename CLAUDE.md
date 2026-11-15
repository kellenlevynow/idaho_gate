# Idaho Gate Co. website: working notes

Custom gate and metal fabrication company in North Idaho. Brand: **Idaho Gate Co.**, domain **idahogate.com**. The original brief and old-site screenshots are in `reference/` for context only. Where they conflict with this file, this file wins.

## Hard rules

- **No photographs.** Every visual is generated: 3D renders, stills rendered from the 3D scenes, and SVG drawings. Label them as concepts. Never present a render as completed work.
- **No invented facts.** No fake reviews, prices, years in business, licence numbers, certifications or project details. Unknown facts are omitted, hidden behind `site.config.ts` values, or listed in `TODO-CONTENT.md`.
- **Copy voice.** Confident, plain-spoken, local, craftsman. Short sentences. Sentence case. No em dashes or en dashes. No filler such as "passionate about quality" or "one-stop shop". Write "wrought iron", never "rod iron".
- **Two conversion paths on every page:** tap-to-call and a quote request, above the fold and at the end.
- **Never fake a form success.** The thank-you page is reached only after the server confirms delivery.
- Contact details, brand name and tracking IDs live only in `src/site.config.ts`.

## Commands

- `npm run dev`, `npm run build`, `npm run check`
- `npm run check:content` after editing copy (title 60, description 155, no dashes)
- `npm run test:e2e` after touching the wizard, lead API or tracking (run against `npm run pages:dev`, see the header of `scripts/e2e.cjs`)
- `npm run test:gate` after touching `functions/_middleware.ts`
- `npm run deploy` builds and uploads to Cloudflare Pages
- `npm run render:stills` and `npm run render:presets` after changing 3D geometry, materials or lighting (dev server must be running)

## Where things are

- Divisions and nav: `src/data/nav.ts`
- Page copy: `src/content/**` (Markdown) and `src/pages/company/*.astro`
- Gate geometry shared by 3D and SVG: `src/lib/gate-model.ts`
- Homepage theater: `src/three/hero.ts`, `src/components/home/GateTheater.astro`, `src/scripts/theater.ts`
- Quote wizard: `src/data/quote-flow.ts`, `src/pages/quote.astro`, `src/scripts/wizard.ts`
- Lead handling: `src/lib/lead.ts`, `src/lib/lead-handler.ts`, `src/lib/lead-server.ts`, `functions/api/lead.ts`
- Preview password gate: `functions/_middleware.ts`
- Tracking events: `src/scripts/tracking.ts` (single source of truth)

## Notes

- Astro 7 with content collections using the glob loader. Front matter values containing a colon must be quoted.
- The dev server's content cache can go stale after a schema error. Delete `.astro/` and restart if entries seem to be missing.
- Hosting is Cloudflare Pages, deployed by direct upload. The site is fully static. Server code lives in `functions/` and must not import anything that needs `import.meta.env` at load time.
- The whole site is password protected until the owner releases it. Do not weaken or remove the gate, and never commit the password.
- `PUBLIC_LAUNCH_READY` gates indexing and the password gate. Keep it false until real contact details are in place and the owner says to go public.
