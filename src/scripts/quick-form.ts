/** Wires every [data-quick-form] on the page to the lead endpoint. */
import { getAttribution } from './attribution';
import { track } from './tracking';
import { submitLead } from './submit-lead';
import type { LeadPayload } from '@/lib/lead';
import type { InquiryPath } from '@/data/nav';

const loadedAt = Date.now();

document.querySelectorAll<HTMLFormElement>('form[data-quick-form]').forEach((form) => {
  const errorEl = form.querySelector<HTMLElement>('[data-form-error]')!;
  const button = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const label = button.querySelector<HTMLElement>('[data-label]')!;
  const original = label.textContent || 'Send';
  let started = false;

  form.addEventListener('input', () => {
    if (!started) {
      started = true;
      track('quote_start', { path: form.dataset.path, form: 'quick' });
    }
  });

  const fail = (message: string, field?: string) => {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    if (field) {
      const input = form.querySelector<HTMLInputElement>(`[name="${field}"]`);
      input?.setAttribute('aria-invalid', 'true');
      input?.focus();
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) || '').trim();

    for (const name of ['name', 'phone', 'city', 'message']) {
      if (!get(name)) return fail('Please fill in every field so we can call you back.', name);
    }
    if (get('phone').replace(/\D/g, '').length < 10) return fail('Please add a phone number with area code.', 'phone');

    const payload: LeadPayload = {
      form: 'quick',
      path: (form.dataset.path as InquiryPath) || 'gates',
      contact: { name: get('name'), phone: get('phone'), city: get('city') },
      answers: {},
      notes: get('message'),
      attribution: getAttribution(),
      meta: {
        elapsedMs: Date.now() - loadedAt,
        hp: get('company_website'),
        pageUrl: location.href,
        context: form.dataset.context || '',
      },
    };

    button.disabled = true;
    label.textContent = 'Sending';
    const result = await submitLead(payload);
    if (result.ok) {
      track('form_submit', { form: 'quick', path: payload.path, lead_score: result.score, lead_tier: result.tier });
      try {
        sessionStorage.setItem('igc_last_lead', JSON.stringify({ form: 'quick', path: payload.path, name: payload.contact.name.split(' ')[0], id: result.id }));
      } catch { /* ignore */ }
      location.href = `/thank-you/?type=quick&path=${payload.path}`;
      return;
    }
    button.disabled = false;
    label.textContent = original;
    track('form_error', { form: 'quick', reason: result.code });
    fail(`${result.error} You can also call us and we will take the details by phone.`, result.field);
  });
});
