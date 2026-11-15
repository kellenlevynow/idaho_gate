import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const faq = z.object({ q: z.string(), a: z.string() });
const spec = z.object({ label: z.string(), value: z.string() });

/** Which generated visual leads the page. All visuals are concept drawings or renders. */
const visual = z.object({
  kind: z.enum(['gate', 'fab']),
  /** key into src/data/gate-presets.ts (kind: gate) or src/lib/fab-drawings.ts (kind: fab) */
  preset: z.string(),
  view: z.enum(['elevation', 'plan', 'both']).default('elevation'),
});

const base = {
  title: z.string(),
  navTitle: z.string().optional(),
  seoTitle: z.string().max(62),
  description: z.string().max(160),
  lede: z.string(),
  order: z.number().default(50),
  visual: visual.optional(),
  specs: z.array(spec).default([]),
  faqs: z.array(faq).default([]),
  related: z.array(z.string()).default([]),
};

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    ...base,
    division: z.enum(['gates', 'automation', 'fabrication']),
    group: z.string(),
    inquiry: z.enum(['gates', 'fabrication', 'commercial', 'repairs']).optional(),
    /** short line for cards and menus */
    summary: z.string(),
    options: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
  }),
});

const industries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/industries' }),
  schema: z.object({
    ...base,
    summary: z.string(),
    inquiry: z.enum(['gates', 'fabrication', 'commercial', 'repairs']).default('gates'),
    needs: z.array(z.object({ title: z.string(), body: z.string(), href: z.string().optional() })).default([]),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    ...base,
    summary: z.string(),
    category: z.enum(['Planning', 'Design', 'Automation', 'Materials', 'Ownership', 'Fabrication']),
    readMinutes: z.number(),
    updated: z.string(),
    takeaways: z.array(z.string()).default([]),
  }),
});

const areas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/areas' }),
  schema: z.object({
    ...base,
    summary: z.string(),
    kind: z.enum(['city', 'region']),
    state: z.enum(['ID', 'WA', 'MT']),
    county: z.string(),
    tier: z.enum(['core', 'extended', 'project']),
    towns: z.array(z.string()).default([]),
    conditions: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
    jurisdictions: z.array(z.string()).default([]),
  }),
});

const concepts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/concepts' }),
  schema: z.object({
    ...base,
    number: z.string(),
    summary: z.string(),
    application: z.enum(['Residential', 'Commercial', 'Ranch', 'Fabrication']),
    productType: z.string(),
    industry: z.string(),
    setting: z.string(),
  }),
});

export const collections = { services, industries, guides, areas, concepts };
