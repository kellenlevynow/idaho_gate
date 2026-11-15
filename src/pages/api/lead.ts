/**
 * POST /api/lead
 * Validates a lead, scores it, then delivers it by email and optional
 * webhook. Responds ok only when at least one delivery actually succeeded,
 * so the site can never show a thank-you page for a lead nobody received.
 */
import type { APIRoute } from 'astro';
import { scoreLead, validateLead } from '@/lib/lead';
import { buildRecord, emailConfigured, env, sendEmail, sendWebhook, webhookConfigured } from '@/lib/lead-server';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const MIN_ELAPSED_MS = { quick: 2500, wizard: 5000 };

export const POST: APIRoute = async ({ request }) => {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 6.2 * 1024 * 1024) return json(413, { ok: false, code: 'too_large', error: 'Attachments are too large. Remove one and try again.' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'bad_json', error: 'Malformed request.' });
  }

  const checked = validateLead(body);
  if (!checked.ok) return json(422, { ok: false, code: 'invalid', error: checked.error, field: checked.field });
  const lead = checked.lead;

  // Spam checks. A filled honeypot is a bot: answer quietly and deliver nothing.
  if (lead.meta.hp) return json(200, { ok: true, id: 'IG-0', score: 0, tier: 'cool' });
  if (lead.meta.elapsedMs < MIN_ELAPSED_MS[lead.form]) {
    return json(429, { ok: false, code: 'too_fast', error: 'That was quick. Please press send once more.' });
  }

  const score = scoreLead(lead);
  const record = buildRecord(lead, score);

  const useEmail = emailConfigured();
  const useWebhook = webhookConfigured();
  const devSink = env('LEAD_DEV_SINK') === 'file' && import.meta.env.DEV;

  if (!useEmail && !useWebhook && !devSink) {
    console.error('[lead] No delivery channel configured. Set RESEND_API_KEY + LEAD_FROM_EMAIL + LEAD_TO_EMAIL, or LEAD_WEBHOOK_URL.');
    return json(503, {
      ok: false, code: 'not_configured',
      error: 'Our online form is not connected yet, so this was not sent.',
    });
  }

  const results = await Promise.all([
    useEmail ? sendEmail(record, lead) : null,
    useWebhook ? sendWebhook(record) : null,
  ]);
  const delivered = results.some((r) => r?.ok);

  if (devSink) {
    // Local development only: write the lead to disk so the flow can be tested without credentials.
    const fs = await import('node:fs/promises');
    await fs.mkdir('.leads', { recursive: true });
    await fs.writeFile(`.leads/${record.id}.json`, JSON.stringify({ ...record, deliveries: results }, null, 2));
  }

  if (!delivered && !devSink) {
    console.error('[lead] Delivery failed', record.id, results.map((r) => r?.detail));
    return json(502, { ok: false, code: 'delivery_failed', error: 'We could not deliver that just now.' });
  }

  console.log('[lead] delivered', record.id, record.path, record.tier, record.score, results.map((r) => r?.detail || 'off').join(' / '));
  return json(200, { ok: true, id: record.id, score: record.score, tier: record.tier });
};

export const GET: APIRoute = () => json(405, { ok: false, error: 'POST only.' });
