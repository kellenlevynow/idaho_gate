import type { LeadPayload } from '@/lib/lead';

export interface LeadResult {
  ok: boolean;
  id?: string;
  score?: number;
  tier?: string;
  error?: string;
  field?: string;
  code?: string;
}

/** Posts a lead. Resolves with ok:false and a message on any failure. Never fakes success. */
export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as LeadResult | null;
    if (!res.ok || !data || !data.ok) {
      return {
        ok: false,
        code: data?.code || `http_${res.status}`,
        field: data?.field,
        error: data?.error || 'We could not send that just now.',
      };
    }
    return data;
  } catch {
    return { ok: false, code: 'network', error: 'We could not reach the server. Check your connection and try again.' };
  }
}
