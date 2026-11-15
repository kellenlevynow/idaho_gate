# Content and facts the owner needs to supply

The site is built with **zero invented business facts**. Where a fact was not available, the site either omits it, hides the element until the value is set, or uses a clearly safe placeholder. This file lists every one.

Until section 1 is done, leave `PUBLIC_LAUNCH_READY=false`. That keeps every page `noindex` and shows a small "preview build" line in the footer.

## 1. Must have before launch

All of these live in **`src/site.config.ts`**.

| Item | Current value | What to do |
|---|---|---|
| Phone | `(208) 555-0142` | **Placeholder.** 555-01xx numbers never ring. Replace `phoneDisplay` and `phoneTel`, set `phonePlaceholder: false`. The old site used 208-258-1814. |
| Lead email | `quotes@idahogate.com` | **Placeholder.** Confirm the inbox exists, set `emailPlaceholder: false`. |
| Hours | Monday to Friday, 7am to 5pm | Confirm, set `hoursPlaceholder: false`. |
| Response time | "one business day" | Confirm you can honor it. Shown on the quote and thank-you pages. |
| Legal entity name | Idaho Gate Co. | Confirm the registered name for the footer and legal pages. |
| Lead delivery | Not configured | Set `RESEND_API_KEY`, `LEAD_FROM_EMAIL`, `LEAD_TO_EMAIL` (and optionally `LEAD_WEBHOOK_URL`) in Netlify. Without them the quote form reports an honest failure. See README. |
| Domain | idahogate.com | Point DNS at Netlify. |

## 2. Trust facts (hidden until supplied)

Set these in `site.trust`. Each appears beside every call to action once filled in.

| Item | Field | Notes |
|---|---|---|
| Idaho contractor registration number | `idahoContractorRegistration` | |
| Washington contractor registration | `washingtonContractorRegistration` | Required before taking Washington work. The Spokane and Eastern Washington pages say "ask us for our current Washington registration". |
| Montana registration | add if obtained | Western Montana page says work is by project. |
| Insurance | `insured: true` | Only if current. |
| Warranty | `warrantySummary` | One line, for example what is covered and for how long. No warranty page exists yet. Add one when terms are written. |
| Years in business | `yearsInBusiness` | Not used in copy yet. |
| Automation brands | `automationBrands`, `automationBrandsConfirmed` | The old site named LiftMaster and DoorKing. The gate operators FAQ repeats that as "our previous installs". Confirm, or edit `src/content/services/automation/gate-operators.md`. |
| Financing | not offered | No financing page was built. |
| Reviews | none | **No reviews or testimonials appear anywhere, and no Review schema is emitted.** Add real ones (text, name, town, permission) and we can build a reviews section. |

## 3. Statements to confirm

These are written into the copy as general descriptions of how the company works. Each is reasonable for a custom gate shop and consistent with the old site, but the owner should confirm it is true.

- [ ] **"Free site visit and written quote."** Shown in the trust strip sitewide. (Old site: "free quote".)
- [ ] **"Drawings approved before we cut steel."** Trust strip and process pages.
- [ ] **"Designed, built and installed by one shop."** Trust strip, about page.
- [ ] **CNC plasma cutting table in house.** Mentioned on many pages. Also tube rolling, MIG and TIG welding. See `src/pages/company/capabilities.astro` and edit the list to match the real shop.
- [ ] **Powder coating and abrasive blasting.** Capabilities page lists them without saying whether they are in house. Galvanizing is described as done through a regional galvanizer.
- [ ] **Aluminum fabrication and TIG welding.** There is a full service page.
- [ ] **Masonry pillars through experienced masons, coordinated by you.** Pillars page.
- [ ] **Licensed engineer available for stamped calculations when required.** Several pages.
- [ ] **Structural steel for builders.** The page says "ask us about current certifications". Remove the page if you do not want this work.
- [ ] **The business "previously operated as Idaho Fortified Gate & Fence Co."** About page and schema `alternateName`. Remove if you would rather not connect the two names.
- [ ] **Service tiers.** `serviceTowns` in `site.config.ts` assigns every town to core, extended or project. Check each against real crew capacity.
- [ ] **Things we say we do not do** (capabilities page): production machining, casting, pressure vessels, ductwork, general fencing by the mile.

## 4. Owner story

The about page has a slot for a personal note that stays hidden until filled in:

```ts
owner: { name: '', role: '', note: '' },
```

A few honest sentences about who runs the shop and why make a real difference on a local trades site.

## 5. Pricing

The cost guide (`/resources/custom-gate-cost/`) explains what drives price and deliberately contains **no numbers**. If you want typical ranges by gate type, supply them and we will add a table. Do not guess.

## 6. Imagery

By instruction, the site uses **no photographs**. Every image is generated from the site's own 3D models and drawing code:

- The homepage theater and its fallback stills (`npm run render:stills`).
- 21 concept renders of gate presets and finishes (`npm run render:presets`).
- All elevation, plan and fabrication drawings (generated at build time).

Everything is labeled as a concept. The projects page says so in plain words. If you later decide to show finished work, the projects section is ready for entries marked "built" and the label system already distinguishes the two.

## 7. Local rules worth a phone call

Service-area pages name the offices a homeowner should contact and deliberately state no local rules. If you know specifics, they make those pages stronger:

- [ ] Fire district gate requirements in the districts you work in most (clear width, key switch type).
- [ ] Any city or county height limits or permit triggers you run into regularly.
- [ ] HOAs you have worked with and what their committees ask for.

## 8. Social and listings

- [ ] Facebook and Instagram URLs (`site.social`). Old handles were `idahofortifiedgate`. Footer links appear only when set.
- [ ] Google Business Profile URL (`site.social.googleBusinessProfile`).
- [ ] Do you still control `idahofortifiedgate.com`? If so, add it as a domain alias so the redirects in `public/_redirects` carry over its search equity.

## 9. Tracking IDs

All optional and off until set (see `.env.example`): `PUBLIC_GTM_ID`, `PUBLIC_GA4_ID`, `PUBLIC_GOOGLE_ADS_ID` with lead and call labels, `PUBLIC_META_PIXEL_ID`, `PUBLIC_CALL_TRACKING_SCRIPT`.

## 10. Legal

The privacy policy and terms are plain-language drafts written for this site. Have them reviewed before launch.
