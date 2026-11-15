/**
 * Server-side lead handling: formatting, email delivery (Resend) and the
 * optional CRM webhook. Imported only by src/pages/api/lead.ts.
 */
import { site } from '@/site.config';
import { inquiryPaths } from '@/data/nav';
import { answerLabel, questionLabel } from '@/data/quote-flow';
import type { LeadPayload, LeadScore } from './lead';

/** Runtime env first (Netlify Functions), then build-time env (astro dev). */
export const env = (key: string): string => {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  return (fromProcess ?? (import.meta.env as Record<string, string | undefined>)[key] ?? '').trim();
};

export interface LeadRecord {
  id: string;
  receivedAt: string;
  form: LeadPayload['form'];
  path: LeadPayload['path'];
  pathLabel: string;
  score: number;
  tier: LeadScore['tier'];
  scoreReasons: string[];
  contact: LeadPayload['contact'];
  /** answers with human-readable labels */
  answers: { id: string; question: string; value: string }[];
  rawAnswers: LeadPayload['answers'];
  notes: string;
  attribution: Record<string, string>;
  pageUrl: string;
  context: string;
  studio: string;
  fileNames: string[];
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);

export function buildRecord(lead: LeadPayload, score: LeadScore): LeadRecord {
  const answers: LeadRecord['answers'] = [];
  for (const [id, raw] of Object.entries(lead.answers || {})) {
    const values = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((v) => answerLabel(lead.path, id, clip(v, 120)));
    if (values.length) answers.push({ id, question: questionLabel(lead.path, id), value: values.join(', ') });
  }
  const attribution: Record<string, string> = {};
  for (const [k, v] of Object.entries(lead.attribution || {})) attribution[clip(k, 60)] = clip(v, 400);
  return {
    id: `IG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
    form: lead.form,
    path: lead.path,
    pathLabel: inquiryPaths[lead.path].short,
    score: score.score,
    tier: score.tier,
    scoreReasons: score.reasons,
    contact: {
      name: clip(lead.contact.name, 120),
      phone: clip(lead.contact.phone, 40),
      email: clip(lead.contact.email, 160),
      bestTime: clip(lead.contact.bestTime, 60),
      city: clip(lead.contact.city, 120),
    },
    answers,
    rawAnswers: lead.answers || {},
    notes: clip(lead.notes, 4000),
    attribution,
    pageUrl: clip(lead.meta.pageUrl, 500),
    context: clip(lead.meta.context, 200),
    studio: clip(lead.meta.studio, 400),
    fileNames: (lead.files || []).map((f) => clip(f.name, 120)),
  };
}

export function subjectLine(r: LeadRecord) {
  const first = r.answers[0]?.value;
  const bits = [r.pathLabel, first, r.contact.city].filter(Boolean).join(' · ');
  return `[${r.tier.toUpperCase()} ${r.score}] ${bits} (${r.contact.name})`;
}

export function emailText(r: LeadRecord) {
  const lines = [
    `New ${r.form === 'wizard' ? 'quote request' : 'quick note'}: ${r.pathLabel}`,
    `Lead score: ${r.score} / 100 (${r.tier})`,
    '',
    `Name:   ${r.contact.name}`,
    `Phone:  ${r.contact.phone}`,
    r.contact.email ? `Email:  ${r.contact.email}` : '',
    r.contact.city ? `City:   ${r.contact.city}` : '',
    r.contact.bestTime ? `Best time to call: ${r.contact.bestTime}` : '',
    '',
    ...r.answers.map((a) => `${a.question}: ${a.value}`),
    r.studio ? `Gate studio design: ${r.studio}` : '',
    '',
    r.notes ? `Notes:\n${r.notes}` : '',
    '',
    r.fileNames.length ? `Attachments: ${r.fileNames.join(', ')}` : 'No attachments.',
    '',
    'Why this score:',
    ...r.scoreReasons.map((x) => `  ${x}`),
    '',
    'Attribution:',
    ...Object.entries(r.attribution).map(([k, v]) => `  ${k}: ${v}`),
    r.context ? `  form_context: ${r.context}` : '',
    '',
    `Reference: ${r.id} · ${r.receivedAt}`,
  ];
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

export function emailHtml(r: LeadRecord) {
  const tierColor = r.tier === 'hot' ? '#a9481a' : r.tier === 'warm' ? '#8a6d1f' : '#55595f';
  const row = (k: string, v: string) =>
    `<tr><td style="padding:7px 14px 7px 0;color:#55595f;font-size:13px;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:7px 0;font-size:15px;color:#131415">${v}</td></tr>`;
  const tel = r.contact.phone.replace(/[^\d+]/g, '');
  return `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;color:#131415">
<div style="max-width:640px;margin:0 auto;padding:28px 22px">
  <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#55595f">${esc(site.name)} · ${r.form === 'wizard' ? 'Quote request' : 'Quick note'}</p>
  <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2">${esc(r.pathLabel)}${r.contact.city ? ` in ${esc(r.contact.city)}` : ''}</h1>
  <p style="margin:0 0 22px"><span style="display:inline-block;background:${tierColor};color:#fff;font-weight:bold;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:6px 12px">${r.tier} lead · ${r.score}/100</span></p>
  <table style="border-collapse:collapse;width:100%;border-top:2px solid #131415">
    ${row('Name', `<strong>${esc(r.contact.name)}</strong>`)}
    ${row('Phone', `<a href="tel:${esc(tel)}" style="color:#a9481a;font-weight:bold">${esc(r.contact.phone)}</a>`)}
    ${r.contact.email ? row('Email', `<a href="mailto:${esc(r.contact.email)}" style="color:#a9481a">${esc(r.contact.email)}</a>`) : ''}
    ${r.contact.bestTime ? row('Best time', esc(r.contact.bestTime)) : ''}
    ${r.answers.map((a) => row(a.question, esc(a.value))).join('')}
    ${r.studio ? row('Studio design', esc(r.studio)) : ''}
    ${r.fileNames.length ? row('Attachments', esc(r.fileNames.join(', '))) : ''}
  </table>
  ${r.notes ? `<h2 style="margin:24px 0 8px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#55595f">Notes</h2><p style="margin:0;font-size:15px;line-height:1.55;white-space:pre-wrap">${esc(r.notes)}</p>` : ''}
  <h2 style="margin:26px 0 8px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#55595f">Why this score</h2>
  <p style="margin:0;font-size:13px;line-height:1.6;color:#55595f">${r.scoreReasons.map(esc).join('<br>')}</p>
  <h2 style="margin:26px 0 8px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#55595f">Attribution</h2>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#55595f;word-break:break-all">${Object.entries(r.attribution).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('<br>')}${r.context ? `<br>form_context: ${esc(r.context)}` : ''}</p>
  <p style="margin:26px 0 0;font-size:12px;color:#8d929a">Reference ${esc(r.id)} · ${esc(r.receivedAt)}</p>
</div></body></html>`;
}

export function recipientsFor(path: LeadPayload['path']): string[] {
  const specific = env(`LEAD_TO_EMAIL_${path.toUpperCase()}`);
  return (specific || env('LEAD_TO_EMAIL')).split(',').map((s) => s.trim()).filter(Boolean);
}

export const emailConfigured = () => !!(env('RESEND_API_KEY') && env('LEAD_FROM_EMAIL') && env('LEAD_TO_EMAIL'));
export const webhookConfigured = () => !!env('LEAD_WEBHOOK_URL');

export async function sendEmail(r: LeadRecord, lead: LeadPayload): Promise<{ ok: boolean; detail: string }> {
  const to = recipientsFor(r.path);
  if (!to.length) return { ok: false, detail: 'no recipients' };
  const body: Record<string, unknown> = {
    from: env('LEAD_FROM_EMAIL'),
    to,
    subject: subjectLine(r),
    text: emailText(r),
    html: emailHtml(r),
    tags: [{ name: 'path', value: r.path }, { name: 'tier', value: r.tier }],
  };
  if (r.contact.email) body.reply_to = r.contact.email;
  if (lead.files?.length) body.attachments = lead.files.map((f) => ({ filename: f.name, content: f.data }));
  try {
    // RESEND_API_URL exists so tests can point delivery at a local mock.
    const res = await fetch(env('RESEND_API_URL') || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, detail: `resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true, detail: 'sent' };
  } catch (err) {
    return { ok: false, detail: `resend error: ${(err as Error).message}` };
  }
}

export async function sendWebhook(r: LeadRecord): Promise<{ ok: boolean; detail: string }> {
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const secret = env('LEAD_WEBHOOK_SECRET');
    if (secret) headers['x-lead-secret'] = secret;
    const res = await fetch(env('LEAD_WEBHOOK_URL'), { method: 'POST', headers, body: JSON.stringify({ source: site.domain, ...r }) });
    if (!res.ok) return { ok: false, detail: `webhook ${res.status}` };
    return { ok: true, detail: 'posted' };
  } catch (err) {
    return { ok: false, detail: `webhook error: ${(err as Error).message}` };
  }
}
