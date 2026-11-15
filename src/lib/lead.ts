/**
 * Shared lead model, validation and scoring. Used by the browser (to shape
 * the payload) and by the server function (the authority on validation).
 */
import type { InquiryPath } from '@/data/nav';

export interface LeadFile {
  name: string;
  type: string;
  /** base64 without the data: prefix */
  data: string;
}

export interface LeadPayload {
  form: 'wizard' | 'quick';
  path: InquiryPath;
  contact: { name: string; phone: string; email?: string; bestTime?: string; city?: string };
  /** qualifying answers keyed by question id */
  answers: Record<string, string | string[]>;
  notes?: string;
  attribution: Record<string, string>;
  files?: LeadFile[];
  meta: { elapsedMs: number; hp: string; pageUrl: string; context?: string; studio?: string };
}

export interface LeadScore {
  score: number;
  tier: 'hot' | 'warm' | 'cool';
  reasons: string[];
}

export const MAX_FILES = 4;
export const MAX_FILE_BYTES = 1.3 * 1024 * 1024; // each, after client-side downscale
export const MAX_TOTAL_BYTES = 4.5 * 1024 * 1024; // stay under serverless body limits
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

/**
 * Lead score, 0 to 100. Weighted toward buying signals the owner can act on:
 * timeline first, then automation, opening size and how reachable the person is.
 */
export function scoreLead(p: LeadPayload): LeadScore {
  let score = 0;
  const reasons: string[] = [];
  const add = (n: number, why: string) => {
    if (n > 0) {
      score += n;
      reasons.push(`+${n} ${why}`);
    }
  };

  const timeline = one(p.answers.timeline);
  add(({ asap: 40, '1-3-months': 30, '3-6-months': 16, researching: 5 } as Record<string, number>)[timeline] || 0, `timeline: ${timeline || 'n/a'}`);

  const automation = one(p.answers.automation);
  add(({ yes: 18, maybe: 9, existing: 12 } as Record<string, number>)[automation] || 0, `automation: ${automation || 'n/a'}`);

  const width = one(p.answers.width);
  add(({ 'under-12': 5, '12-16': 8, '16-20': 11, '20-plus': 14 } as Record<string, number>)[width] || 0, `width: ${width || 'n/a'}`);

  const budget = one(p.answers.budget);
  add(({ 'under-5k': 2, '5-10k': 6, '10-20k': 9, '20-40k': 12, '40k-plus': 14 } as Record<string, number>)[budget] || 0, `budget: ${budget || 'n/a'}`);

  if (p.path === 'commercial') add(8, 'commercial project');
  if (p.path === 'repairs' && one(p.answers.urgency) === 'stuck') add(30, 'gate stuck or unsafe now');
  const addons = p.answers.addons;
  if (Array.isArray(addons) && addons.length >= 2) add(4, `${addons.length} add-ons`);
  if (p.files && p.files.length) add(5, 'photos or drawings attached');
  if (p.contact.email && p.contact.phone) add(4, 'phone and email given');
  if (p.form === 'quick') add(10, 'direct note');

  score = Math.max(0, Math.min(100, score));
  const tier = score >= 65 ? 'hot' : score >= 40 ? 'warm' : 'cool';
  return { score, tier, reasons };
}

export function validateLead(p: unknown): { ok: true; lead: LeadPayload } | { ok: false; error: string; field?: string } {
  if (!p || typeof p !== 'object') return { ok: false, error: 'Malformed request.' };
  const lead = p as LeadPayload;
  if (lead.form !== 'wizard' && lead.form !== 'quick') return { ok: false, error: 'Unknown form.' };
  if (!['gates', 'fabrication', 'commercial', 'repairs'].includes(lead.path)) return { ok: false, error: 'Unknown inquiry type.' };
  const c = lead.contact || ({} as LeadPayload['contact']);
  if (!c.name || c.name.trim().length < 2) return { ok: false, error: 'Please add your name.', field: 'name' };
  const digits = (c.phone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return { ok: false, error: 'Please add a phone number with area code.', field: 'phone' };
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) return { ok: false, error: 'That email address does not look right.', field: 'email' };
  if (lead.form === 'wizard' && !c.email) return { ok: false, error: 'Please add an email address.', field: 'email' };
  if (!lead.meta || typeof lead.meta.elapsedMs !== 'number') return { ok: false, error: 'Malformed request.' };
  if (lead.files) {
    if (lead.files.length > MAX_FILES) return { ok: false, error: `Please attach ${MAX_FILES} files or fewer.`, field: 'files' };
    let total = 0;
    for (const f of lead.files) {
      if (!ALLOWED_FILE_TYPES.includes(f.type)) return { ok: false, error: 'Attachments must be JPG, PNG, WebP or PDF.', field: 'files' };
      const bytes = Math.floor((f.data.length * 3) / 4);
      if (bytes > MAX_FILE_BYTES) return { ok: false, error: `${f.name} is too large to send.`, field: 'files' };
      total += bytes;
    }
    if (total > MAX_TOTAL_BYTES) return { ok: false, error: 'Attachments are too large in total. Remove one and try again.', field: 'files' };
  }
  return { ok: true, lead };
}
