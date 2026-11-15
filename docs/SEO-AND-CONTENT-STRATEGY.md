# SEO and content strategy

How the site is organized for search, what each page type is meant to rank for, and what to publish next. No search-volume figures are given here. The old site's analytics were not available, and we will not invent numbers. Connect Google Search Console at launch and let real queries guide the next round.

## 1. Site architecture

```
/                               Home: brand, 3D experience, divisions
/gates/                         Division hub
  /gates/<type>/                11 pages: 8 gate types, 2 finishing, 1 service
/automation/                    Division hub
  /automation/<system>/         4 pages
/fabrication/                   Division hub
  /fabrication/<service>/       8 pages
/industries/                    Hub + 6 pages
/projects/                      Concept-study gallery + 8 studies
/resources/                     Guide hub + 11 guides
/faq/                           40+ questions with FAQPage schema
/service-area/                  Hub with map + 11 local and regional pages
/company/                       6 pages
/studio/                        Interactive 3D configurator
/quote/  /contact/  /thank-you/ Conversion
/privacy/  /terms/
```

81 pages at launch. Every page has one job and ends in a quote path.

## 2. What each page type targets

| Page type | Search intent | Example query themes |
|---|---|---|
| Gate type pages | "I want this kind of gate" | custom driveway gates, sliding gate, cantilever gate, ranch gate, estate gate, modern gate, pedestrian gate |
| Automation pages | "I need the gate to open itself" or "mine is broken" | gate opener installation, gate keypad, solar gate opener, gate safety sensors, UL 325 |
| Fabrication pages | "Who builds this near me" | metal fabrication, custom railings, steel fabrication, privacy screen, bollards, dock gangway |
| Service-area pages | Any of the above plus a place | custom gates Coeur d'Alene, gate installer Post Falls, driveway gate Sandpoint, gate company Spokane |
| Guides | Questions before buying | how much does a driveway gate cost, swing vs sliding gate, gate in snow, do I need a permit for a gate |
| Industries | Buyer type | commercial gates, HOA gate, ranch entry, builder steel fabrication |
| Concept studies | Visual and design intent | arched estate gate, horizontal slat gate, ranch entry arch |

## 3. Geographic strategy

The business serves a region, not a town. The structure reflects that without creating doorway pages.

- **One hub** (`/service-area/`) with a map, the three service tiers and a plain list of every community.
- **Eight local pages** for places with distinct conditions: Coeur d'Alene, Post Falls, Hayden, Rathdrum, Sandpoint, Priest River, Bonners Ferry and Spokane.
- **Three regional pages**: Silver Valley, Eastern Washington and Western Montana.

Each local page is written from scratch around what is different there:

| Page | What makes it local |
|---|---|
| Coeur d'Alene | Steep lake-view drives, mixed city and county jurisdiction, highway districts |
| Post Falls | New subdivisions, HOA design review, prairie wind, cross-border households |
| Hayden | Lake estates, seasonal use, mature trees, estate entrances |
| Rathdrum | Open prairie, wind and drifting snow, wide acreage openings, solar |
| Sandpoint | Heavy snow, mountain drives, lake and resort work |
| Priest River | Seasonal cabins, no power at the gate, deep shade |
| Bonners Ferry | Working farms, off-grid properties, entry arches |
| Silver Valley | Narrow hillside lots, railings and stairs, historic buildings |
| Spokane | Washington registration, sales tax, urban lots, commercial work |
| Eastern Washington | Project basis, fabricate and deliver |
| Western Montana | Project basis, mountain passes, Montana rules |

Each also lists the offices a homeowner should call (city, county, highway district, fire district). That is genuinely useful and hard to copy.

**Rules for adding a place page later**
1. Only add one if you actually serve it and can say something specific about it.
2. Add completed local projects as they happen. Real local work is the strongest content there is.
3. Never clone a page and swap the town name.

## 4. Technical SEO in the build

- Unique `<title>` and meta description on every page, checked by `npm run check:content` (60 and 155 character limits).
- Canonical URL, Open Graph and Twitter card tags on every page.
- JSON-LD: `HomeAndConstructionBusiness` and `WebSite` sitewide. `Service` on service, industry and area pages. `FAQPage` wherever FAQs appear. `BreadcrumbList` on every interior page. `Article` on guides. `HowTo` on the approach page. `ImageObject` on concept studies.
- `Review` and `AggregateRating` schema are intentionally absent. Add them only with real reviews.
- XML sitemap generated at build. `robots.txt` generated from config.
- **Preview safety:** until `PUBLIC_LAUNCH_READY=true`, the whole site is behind a password, every page is `noindex` and `robots.txt` disallows everything. A preview build cannot rank or be mistaken for the live site.
- Placeholder phone and email are kept out of structured data until real values are set.
- Static HTML, self-hosted fonts, responsive AVIF and WebP images, three.js loaded only after first paint.
- Descriptive alt text on every render and an accessible name on every drawing.

## 5. Internal linking

- Every service page links to six related pages chosen by hand: sibling services, the relevant guide, a concept study and a local page.
- Every guide links back to the services it informs.
- Every local page links to the gate types that suit its conditions.
- The header mega menu and the footer link to every service page, so nothing is more than one click from anywhere.
- Each page type ends in the same conversion band with a quote button, a phone link and a four-field form.

## 6. Old domain redirects

If the owner still controls `idahofortifiedgate.com`, point it at this site. `public/_redirects` already maps the old Squarespace paths:

| Old path | New path |
|---|---|
| `/custom-gates` | `/gates/` |
| `/our-story` | `/company/about/` |
| `/contact-us-1` | `/contact/` |
| `/iron-works` | `/fabrication/` |
| `/fencing` | `/gates/` |

Add the old domain to the Cloudflare Pages project so these fire with a 301. Do not let the old domain lapse to a third party.

## 7. Off-site essentials

1. **Google Business Profile.** Claim or update it with the new name, a service-area setting (no street address if customers do not visit), the real phone and the new URL. Name, area and phone must match the site exactly.
2. **Search Console and Bing Webmaster Tools.** Verify the domain and submit `sitemap-index.xml`.
3. **Reviews.** Ask every finished customer. Reviews on the Business Profile matter more for local ranking than anything on the site.
4. **Citations.** Update the business name and URL wherever the old name is listed.
5. **Contractor registration numbers.** Publish them in `site.config.ts` once confirmed. They appear in the trust strip and are a strong local signal.

## 8. Content roadmap after launch

Publish in this order. Each is a real buyer question.

**First 90 days**
1. Completed project write-ups, one per finished job, with the town. Replace or sit alongside concept studies and label them "built".
2. "How wide should a driveway gate be?" (short, specific, links to measuring guide).
3. "Cantilever vs V-track sliding gates in snow."
4. "Gate opener battery replacement: when and how."
5. "What a gate HOA submittal should include."

**Next**
6. "Solar gate opener sizing for North Idaho" with a worked example from a real install.
7. "Deck railing code basics for Kootenai County homeowners" after confirming adopted code with the county.
8. "Fire district gate requirements" pages for each district you work in, written after speaking with each one.
9. "Weathering steel: what the first three years look like" with dated progress images.
10. A price guide with real ranges, once the owner supplies them.

**Ongoing**
- Add questions customers actually ask to the FAQ.
- Review Search Console monthly. Where a page gets impressions for a query it does not answer well, add a section.

## 9. Measuring it

Every lead carries first-touch and last-touch UTM values, click IDs, landing page, referrer and the last service page viewed. With GA4 connected you also get `call_click`, `quote_start`, `quote_step_n`, `quote_submit` and `form_submit` events. Track three numbers weekly:

1. Quote requests and call clicks per day.
2. Share of leads scored "hot".
3. Which service and area pages those leads viewed.

That is the comparison against the old site's "multiple hot leads a day".
