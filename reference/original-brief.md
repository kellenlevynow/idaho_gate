# Custom Gate Website Build Brief

You are building a new lead-generation website for a custom gate company in Idaho. This file is your full context. Read all of it, look at every image in `reference/old-site-screenshots/`, then propose a plan before writing code.

## 1. Mission

The owner ran a Squarespace site, idahofortifiedgate.com ("Idaho Fortified Gate & Fence Co."), that produced **multiple hot leads per day**. That site has expired. We are building a replacement on a **new domain** that:

1. **Offers only custom gate services.** No general fencing, no ranch fencing, no barn doors, no mobile welding. Gates, gate automation, and the things that finish a gate (pillars, address plates, lighting) are in scope. Everything else is out.
2. **Keeps the lead mechanics that worked** (section 3).
3. **Looks modern and polished.** The old site was a stock Squarespace template with a serif font and a photo grid. The new one should feel like a premium, design-led craftsman brand.
4. **Has roughly 10x the depth** of the old site. The old site had 6 thin pages and about 600 words total. The new site should be a real authority on custom gates in its service area: dozens of substantive pages, each one answering a real buyer question and each one ending in a quote path.

Success = more qualified gate quote requests per day than the old site, from people ready to spend on a custom gate.

## 2. Fill these in before building (ask the owner if blank)

Do not invent any of these. If a value is still `TBD` when you need it, stop and ask, or use an obvious placeholder like `[[PHONE]]` that is easy to find and replace.

| Item | Value |
|---|---|
| New brand name | TBD (old: Idaho Fortified Gate & Fence Co.) |
| New domain | TBD |
| Phone (tap to call) | TBD (old site: 208-258-1814) |
| Email for leads | TBD (old site: idahofortifiedgate@gmail.com) |
| Service area cities | TBD (old site said "Greater Treasure Valley") |
| Years in business / projects completed | TBD |
| Licensed / bonded / insured details | TBD |
| Warranty terms | TBD |
| Typical price ranges by gate type | TBD (needed for cost guide; never make these up) |
| Financing offered? | TBD |
| Automation brands installed | Old site: LiftMaster and DoorKing. Confirm. |
| Real customer reviews (text, name, city, permission) | TBD. **Never write fake reviews or testimonials.** |
| Google Business Profile URL | TBD |
| Facebook / Instagram | Old: facebook.com/idahofortifiedgate, instagram.com/idahofortifiedgate. Confirm if still used. |
| Do we own the old domain? (for 301 redirects) | TBD |
| Lead destination (email only, CRM, webhook) | TBD |

## 3. What made the old site convert (preserve these)

The old site's analytics are locked because the plan expired, so there is no keyword or traffic data. These are observations from the site itself. Treat them as hypotheses to keep, not proven facts.

- **Phone first.** The homepage's main button ("SCHEDULE A FREE CUSTOM FENCE & GATE QUOTE NOW!") was a `tel:` link, not a form. Every page footer had a tap-to-call number. Many leads were probably calls.
- **"Free quote" offer on every page.** Each page ended in one clear CTA: "Get a free custom gate quote", "Start your journey to a custom gate today".
- **Low-friction form.** First name, last name, email, phone, message. All required. Nothing else.
- **Real work photos, not stock.** Driveway gates between stone pillars, ranch gates, iron gates. Plus a rendered concept drawing ("Sawtooth Gate Concept") showing they design custom pieces.
- **A real face.** The Our Story page showed the owner on a job site with a tape measure. Trust signal for a local trades business.
- **Local identity.** Idaho state silhouette logo in reclaimed-wood texture. "Treasure Valley" and "Idaho" in every meta description.
- **Security angle.** Copy leaned on "FORTIFIED" and security: "Security begins with...", "ultimate fortification for your home & property".
- **High-value add-ons named.** Automation (LiftMaster, DoorKing, Bluetooth and Wi-Fi), masonry pillars (brick, natural stone, synthetic), custom address plates, post lighting. These raise ticket size.

What to improve:

- Copy was Title Case Every Word and thin. Write naturally, in sentence case.
- "Rod iron" should be **wrought iron** everywhere.
- No gallery depth, no process explanation, no pricing guidance, no FAQ, no reviews, no service-area content, no schema. Fix all of these.
- No quote qualification. The new form should capture gate type, size, automation, and timeline so the owner can prioritize hot leads.

## 4. Old site inventory (for reference and copy salvage)

Nav: Home, Custom Gates, Fencing, Iron Works, Our Story, Contact Us. Logo text centered in header. Font: Cinzel (headings and nav), sans body. Black on white.

**Home** (`/`): 5-photo grid of fences, one CTA button (tel link), Idaho logo, footer with phone, email, FB, IG.
Meta: "Idaho Fortified Gate and Fence Co. is a Custom Gate & Fence Installer servicing the Greater Treasure Valley. We also provide Custom Steel Fabrication Services such as Barn Doors, Custom Railing, Agricultural Equipment and much more!"

**Custom Gates** (`/custom-gates`), the page that matters most:
- *Custom Gate Design*: "We understand that your gate is the entry point to your home. We will walk you through the process of designing the perfect addition with fine craftsmanship that can't be replicated." Bullets: hand crafted steel & wrought iron gates; automatic, sliding & swinging gates; copper, aluminum, vinyl & wooden gates.
- *Gate Openers & Automation*: top quality automated systems by LiftMaster & DoorKing; certified technicians to install secure systems; customizable security packages with Bluetooth & Wi-Fi capabilities. "Security begins with Idaho Fortified Gate & Fence Co."
- *Custom Masonry*: customizable masonry pillars & columns; brick, natural stone & rock, synthetic alternatives; custom address plates & post lighting available.
- CTA: "Get a free custom gate quote" to contact page.
Meta: "Idaho Fortified Gate and Fence Co. is Idaho's Premier Gate Installer. From the design process to installation we ensure the highest quality components and workmanship go into your custom made Idaho gate. We pride ourselves on the security that goes into every project."

**Fencing**, **Iron Works**: out of scope. Do not carry over.

**Our Story** (`/our-story`): owner photo. "Idaho Fortified Gate & Fence Co. engineers gates with superior steel & components to provide the ultimate fortification for your home & property. Our design process is unmatched. From concept to completion every detail is included with your security in mind. Over the years, we have perfected our craft to withstand the test of time. With security at the forefront, [we pride ourselves] on premium quality fabrication, reliability & strength." CTA: "Start your journey to a custom gate today".

**Contact** (`/contact-us-1`): wide photo of a black iron fence and gate with stone pillars, "We'd love to hear from you! Call us anytime for a free quote [phone]", then the 5-field form.

### Reusable photos (if the owner approves reuse)

These are the owner's own photos on the Squarespace CDN. Try downloading with `?format=2500w` appended. If they no longer load, ask the owner for originals. Gate photos are the priority.

```
GATES (priority)
https://images.squarespace-cdn.com/content/v1/5efa1c99c7dadd0ad3c946eb/1606859632466-PL8QZO8K1113GUDNZDB5/Sawtooth+Gate+Concept+V1.jpg   (rendered concept: arched iron gate, mountain silhouette panel, stone-pattern side panels)
https://images.squarespace-cdn.com/content/v1/5efa1c99c7dadd0ad3c946eb/1606857896661-CZXYDBDAJE2NOZ62VWSY/Gate+Gallery+21.jpg            (black arched iron driveway gate, stacked stone pillar, opener arm)
https://images.squarespace-cdn.com/content/v1/5efa1c99c7dadd0ad3c946eb/1606859383197-H6QGJ4Q24I9M0R0YXT5X/GateGallery2.jpg               (dark steel ranch-style double gate between natural stone pillars, address plate 36296)

LOGO
https://images.squarespace-cdn.com/content/v1/5efa1c99c7dadd0ad3c946eb/1605488076826-F3WH1WJ0X6E3HXOWUOZ9/FG%26F+Wood+Social+Logo-14.png  (Idaho silhouette, wood texture)

FENCE PHOTOS (old homepage; only use if a gate is visible)
.../1606852100998-7MA7IL0NL9OFT1B6NSOY/Gate+Gallery14.jpeg
.../1606854106538-UIVU3EEJHKMT39YWAK7P/Gate+Gallery+19.JPG
.../1606852141426-5O9TYAGYBLOKYRWNJSIP/GateGallery15.jpeg
.../1606852297901-R75WY1NO1X2FWPDR1ZFQ/Gate+Gallery+20.jpeg
.../1606852331001-A8P47SKQMZ0WOP0334UR/GateGallery16.jpg
(prefix: https://images.squarespace-cdn.com/content/v1/5efa1c99c7dadd0ad3c946eb)
```

The file names suggest a "Gate Gallery" set of at least 21 photos. Ask the owner for the full set plus any newer project photos. Photography is the single biggest lever for this design.

### Screenshots of the old site

In `reference/old-site-screenshots/`:

| File | Shows |
|---|---|
| 01-home-hero-gallery.jpg | Header, nav, 5-photo grid, CTA button |
| 02-home-cta-logo-footer.jpg | CTA, Idaho wood logo, footer contact + social |
| 03-custom-gates-design-and-automation.jpg | Sawtooth concept render, gate design copy, automation section with iron gate photo |
| 04-custom-gates-masonry-and-cta.jpg | Masonry pillars section, address plate photo, quote CTA |
| 05-fencing-page-out-of-scope.jpg | For reference only. Do not rebuild. |
| 06-iron-works-page-out-of-scope.jpg | For reference only. Do not rebuild. |
| 07-our-story-owner-photo.jpg | Owner photo and about copy |
| 08-contact-form.jpg | Contact header photo and form |

Use them to understand brand equity and what to keep. Do not copy the layout. The goal is a clear visual upgrade.

## 5. Design direction

Feel: **forged, precise, premium, local.** Think architectural metalwork studio meets trusted Idaho tradesman. Not a generic contractor template, not luxury-cold.

- **Photography leads.** Full-bleed hero with a real gate at golden hour. Large, edge-to-edge project imagery. Before/after sliders where available.
- **Palette** (starting point, adjust with taste): forged charcoal `#1C1D1F`, blackened steel `#2B2D31`, bone `#F4F1EA`, warm stone `#C9BFAE`, patina/corten accent `#B5562B` for CTAs only. High contrast, WCAG AA everywhere.
- **Type:** a confident display face for headlines (e.g. a refined serif or a strong condensed grotesk; keep a nod to the old Cinzel heritage only if it still looks modern), a clean humanist sans for body. Self-host fonts.
- **Details:** subtle metal texture or plasma-cut line motifs (mountain ridgeline, like the Sawtooth concept), thin rules, generous whitespace, restrained motion (fade/slide on scroll, respects `prefers-reduced-motion`).
- **Logo:** keep the Idaho silhouette idea, redraw it clean as SVG for the new brand. Do not use the wood-texture PNG as the main logo.
- **Mobile first.** Most local service leads come from phones. Sticky bottom bar on mobile: `Call` and `Get a Quote`. Header on desktop: phone number visible plus a quote button.

## 6. Conversion system (non-negotiable)

1. **Two paths everywhere:** tap-to-call and a quote request. Visible above the fold on every page and again at the end of every page.
2. **Quote wizard** (`/quote`) as the main form. Multi-step, progress bar, under 60 seconds:
   - Gate type (driveway swing, sliding, bi-fold, pedestrian/walk, ranch/farm, not sure)
   - Approx. opening width (under 12 ft, 12 to 16, 16 to 20, 20+, not sure)
   - Material/style (wrought iron, steel, aluminum, wood and steel, decorative plasma-cut, not sure)
   - Automation (yes, maybe, no) and add-ons (keypad, intercom/app access, solar, pillars, address plate, lighting)
   - Timeline (ASAP, 1 to 3 months, 3 to 6 months, just researching)
   - Project address / city (validate against service area)
   - Optional photo upload of the opening
   - Name, phone, email, best time to call, notes
   - Keep a short 4-field "quick quote" version (name, phone, city, message) in page footers and sidebars.
3. **Lead routing:** send every lead by email immediately, and support a webhook (env var) so leads can flow to a CRM. Include a lead score field (timeline + automation + width) so the owner can call hot leads first.
4. **Attribution:** capture UTM params, gclid/fbclid, landing page and referrer in hidden fields and pass them with the lead.
5. **Tracking:** GA4 events for `call_click`, `quote_start`, `quote_step_n`, `quote_submit`, `form_submit`. Slots for Google Ads conversion tag, Meta pixel, and a call-tracking number swap script. All configured by env vars, all off by default until IDs are set.
6. **Thank-you page** (`/thank-you`) with expectations ("we'll call within X business hours"), what happens next, and a gallery link. Fire conversions here.
7. **Trust near every CTA:** licensed and insured badge, warranty, local and owner-operated, real review snippets (only real ones), brands installed.
8. **Spam protection** without hurting conversion: honeypot plus time-to-submit check. No CAPTCHA unless spam becomes a problem.

## 7. Information architecture (the 10x depth)

Target 50 to 70 pages at launch. Every page must be genuinely useful, unique, and end in a quote path. No thin or duplicated pages. Use MDX/content collections so new pages are easy to add.

**Core**
- `/` Home: hero, gate types, featured projects, process, automation, pillars, reviews, service area, FAQ teaser, CTA
- `/quote` Quote wizard
- `/thank-you`
- `/about` Owner story, shop, craftsmanship, values (reuse owner photo)
- `/process` Consult, measure, design and render, fabricate, finish, install, automate, warranty
- `/gallery` Filterable by gate type, material, automation, city
- `/projects/[slug]` 8 to 15 case studies: problem, design, materials, automation, photos, city
- `/reviews`
- `/warranty`
- `/financing` (only if offered)
- `/contact`
- `/privacy`, `/terms`

**Gate types** (`/gates/...`), each 800 to 1,500 words, photos, specs, options, typical price range, FAQ, CTA
- driveway-gates, swing-gates, sliding-gates (V-track and cantilever), bi-fold-gates, pedestrian-walk-gates, estate-entry-gates, ranch-farm-gates, security-gates, rv-and-shop-gates, courtyard-and-garden-gates

**Materials and styles** (`/materials/...`)
- wrought-iron-gates, steel-gates, aluminum-gates, wood-and-steel-gates, decorative-plasma-cut-gates (custom silhouettes like the Sawtooth concept), modern-horizontal-slat-gates, finishes (powder coat vs paint, Idaho winter durability)

**Automation** (`/automation/...`)
- gate-openers (overview), liftmaster-gate-openers, doorking-gate-openers (confirm brands), solar-gate-openers, keypads-and-intercoms, smartphone-and-wifi-access, safety-sensors-and-loops, gate-opener-repair-and-upgrades (only if they service automation on existing gates; confirm)

**Finishing** (`/finishing/...`)
- stone-and-masonry-pillars, brick-pillars, address-plates, gate-post-lighting

**Service areas** (`/service-areas/[city]`). One page per confirmed city. Each must have unique content: local projects there, neighborhoods or acreage types common there, HOA or county notes the owner confirms, drive time, photos from that city. Do not generate near-duplicate city pages.

**Resources** (`/guides/...`), the authority layer
- custom-gate-cost (needs real owner price ranges)
- swing-vs-sliding-gates
- how-to-choose-a-driveway-gate
- gate-opener-buying-guide
- automatic-gates-in-snow-and-ice
- hoa-and-permit-considerations (keep general; have the owner confirm anything local)
- gate-maintenance-checklist
- measuring-your-opening (with a simple diagram)
- what-to-expect-during-install
- `/faq` with FAQPage schema (30+ questions sourced from the guides)

## 8. SEO requirements

- Unique title (under 60 chars) and meta description (under 155) on every page. Pattern: `[Service] in [Area] | [Brand]`.
- Schema JSON-LD: `HomeAndConstructionBusiness` (LocalBusiness) with areaServed, `Service` per gate/automation page, `FAQPage`, `BreadcrumbList`, `ImageObject` on gallery items. Add `Review`/`AggregateRating` only with real reviews.
- XML sitemap, robots.txt, canonical tags, Open Graph and Twitter cards with real project images.
- Descriptive image file names and alt text (old site used names like "GateGallery16.jpg"; fix this).
- Internal linking: every gate type links to related materials, automation, pillars, guides, and the quote wizard.
- If the owner controls idahofortifiedgate.com: set up 301 redirects from `/custom-gates`, `/our-story`, `/contact-us-1` to the matching new pages to carry over search equity. Ask before assuming.
- NAP (name, address/area, phone) consistent with the Google Business Profile.

## 9. Tech stack (recommended; propose changes if you see a better fit)

- **Astro** + **Tailwind CSS**, static output, MDX content collections for gates, materials, guides, projects, cities.
- Images through Astro's image pipeline (AVIF/WebP, responsive `srcset`, lazy loading below the fold).
- Forms: serverless function (Netlify Functions, Vercel, or Cloudflare Pages Functions) that emails the lead and posts to an optional webhook. Photo upload to the host's blob storage or emailed as an attachment.
- Hosting: Netlify, Vercel, or Cloudflare Pages. Pick one and document deploy steps in README.
- Config in one `site.config.ts`: brand, phone, email, service areas, socials, tracking IDs. No hardcoded contact details in components.
- No heavy JS frameworks on content pages. Islands only where interactivity is needed (wizard, gallery filter, before/after slider).

## 10. Quality bar (acceptance criteria)

- Lighthouse mobile: Performance 95+, Accessibility 100, Best Practices 100, SEO 100.
- LCP under 2.0s on 4G, CLS under 0.05.
- WCAG 2.1 AA: contrast, focus states, labeled inputs, keyboard-usable wizard.
- Call and quote CTAs reachable within one thumb tap on every mobile page.
- Quote wizard completes in under 60 seconds on a phone; tested end to end, lead email received, webhook payload verified, UTMs present.
- Zero invented facts: no fake reviews, prices, certifications, years in business, or project details. Placeholders are clearly marked `[[LIKE_THIS]]` and listed in a `TODO-CONTENT.md`.
- Copy voice: confident, plain-spoken, local, craftsman. Short sentences. Sentence case. No em dashes. No buzzword filler.

## 11. How to work

1. Read this file and view every screenshot. Summarize what you understood and list open questions from section 2.
2. Propose the sitemap, design direction (with a moodboard description or a single-page style tile), and stack. Wait for approval.
3. Build in phases, committing after each:
   - Phase 1: design system, layout, home, quote wizard, thank-you, contact, lead delivery, tracking. This alone should already beat the old site.
   - Phase 2: gate type, automation, finishing, about, process, gallery, projects.
   - Phase 3: guides, FAQ, service areas, schema everywhere, redirects.
   - Phase 4: performance, accessibility, and conversion QA against section 10.
4. Maintain `TODO-CONTENT.md` listing every placeholder, missing photo, and fact the owner needs to supply.
