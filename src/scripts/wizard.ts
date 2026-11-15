/**
 * Quote wizard. Progressive, keyboard-usable, and honest about failure:
 * the thank-you page is only reached after the server confirms delivery.
 */
import { getAttribution } from './attribution';
import { track } from './tracking';
import { submitLead } from './submit-lead';
import { MAX_FILES, MAX_FILE_BYTES, type LeadFile, type LeadPayload } from '@/lib/lead';
import { inquiryPaths, type InquiryPath } from '@/data/nav';

const root = document.querySelector<HTMLElement>('[data-wizard]');
if (root) {
  const form = root.querySelector<HTMLFormElement>('[data-wizard-form]')!;
  const nav = root.querySelector<HTMLElement>('[data-nav]')!;
  const backBtn = nav.querySelector<HTMLButtonElement>('[data-back]')!;
  const nextBtn = nav.querySelector<HTMLButtonElement>('[data-next]')!;
  const submitBtn = nav.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = submitBtn.querySelector<HTMLElement>('[data-submit-label]')!;
  const navHint = nav.querySelector<HTMLElement>('[data-nav-hint]')!;
  const progress = root.querySelector<HTMLElement>('[data-progress]')!;
  const submitError = root.querySelector<HTMLElement>('[data-submit-error]')!;
  const submitErrorText = root.querySelector<HTMLElement>('[data-submit-error-text]')!;
  const summary = document.querySelector<HTMLElement>('[data-summary]')!;
  const pathStep = root.querySelector<HTMLElement>('[data-step="path"]')!;
  const contactStep = root.querySelector<HTMLElement>('[data-step="contact"]')!;
  const query = new URLSearchParams(location.search);
  const startedAt = Date.now();
  const STORE = 'igc_wizard_v1';

  let path: InquiryPath | null = null;
  let index = 0; // 0 = path step
  let files: LeadFile[] = [];
  let started = false;
  let maxTracked = 0;
  const studio = (query.get('studio') || '').slice(0, 300);

  const stepsFor = (p: InquiryPath | null): HTMLElement[] => {
    if (!p) return [pathStep];
    const mid = [...root.querySelectorAll<HTMLElement>(`[data-path="${p}"]`)].sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
    return [pathStep, ...mid, contactStep];
  };
  const current = () => stepsFor(path)[index];

  /* ---------- answers ---------- */
  const collect = () => {
    const answers: Record<string, string | string[]> = {};
    if (!path) return answers;
    for (const step of stepsFor(path).slice(1, -1)) {
      step.querySelectorAll<HTMLElement>('[data-question]').forEach((q) => {
        const id = q.dataset.question!;
        const type = q.dataset.type;
        if (type === 'single') {
          const v = q.querySelector<HTMLInputElement>('input:checked')?.value;
          if (v) answers[id] = v;
        } else if (type === 'multi') {
          const v = [...q.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value);
          if (v.length) answers[id] = v;
        }
      });
    }
    return answers;
  };
  const cityInput = () => (path ? root.querySelector<HTMLInputElement>(`[name="${path}.city"]`) : null);

  const labelOf = (input: HTMLInputElement) => input.closest('.choice')?.querySelector('.choice-title')?.textContent?.trim() || input.value;

  const renderSummary = () => {
    const rows: [string, string][] = [];
    if (path) rows.push(['Request', inquiryPaths[path].short]);
    if (path) {
      for (const step of stepsFor(path).slice(1, -1)) {
        step.querySelectorAll<HTMLElement>('[data-question]').forEach((q) => {
          const checked = [...q.querySelectorAll<HTMLInputElement>('input:checked')];
          if (checked.length) {
            const label = q.querySelector('.field-label')?.childNodes[0]?.textContent?.trim() || step.dataset.name || '';
            rows.push([label, checked.map(labelOf).join(', ')]);
          }
        });
      }
      const city = cityInput()?.value.trim();
      if (city) rows.push(['Location', city]);
      if (files.length) rows.push(['Attachments', `${files.length} file${files.length > 1 ? 's' : ''}`]);
    }
    if (studio) rows.push(['Studio design', studio]);
    summary.innerHTML = rows.length
      ? rows.map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${v.replace(/</g, '&lt;')}</dd></div>`).join('')
      : '<div class="text-sm text-steel-500">Your answers appear here as you go.</div>';
  };

  const save = () => {
    try {
      const checked = [...form.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => `${i.name}=${i.value}`);
      sessionStorage.setItem(STORE, JSON.stringify({ checked, city: cityInput()?.value || '', path }));
    } catch { /* ignore */ }
  };
  const restore = () => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const data = JSON.parse(raw) as { checked: string[]; city: string; path: InquiryPath | null };
      for (const pair of data.checked) {
        const [name, value] = pair.split('=');
        const el = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
      }
      if (data.path) {
        path = data.path;
        const c = cityInput();
        if (c && data.city) c.value = data.city;
      }
    } catch { /* ignore */ }
  };

  /* ---------- navigation ---------- */
  const show = (focus = true) => {
    const steps = stepsFor(path);
    root.querySelectorAll<HTMLElement>('[data-step]').forEach((s) => (s.hidden = s !== steps[index]));
    const isPath = index === 0;
    const isLast = index === steps.length - 1 && !!path;
    nav.hidden = isPath;
    progress.hidden = isPath;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
    backBtn.hidden = false;
    navHint.textContent = isLast ? `We call within ${root.dataset.response || 'one business day'}.` : '';
    if (path) {
      progress.querySelector('[data-progress-path]')!.textContent = inquiryPaths[path].short;
      progress.querySelector('[data-progress-n]')!.textContent = String(index + 1);
      progress.querySelector('[data-progress-total]')!.textContent = String(steps.length);
      progress.querySelector('[data-progress-name]')!.textContent = steps[index].dataset.name || '';
      progress.querySelector<HTMLElement>('[data-progress-bar]')!.style.transform = `scaleX(${index / (steps.length - 1)})`;
    }
    submitError.classList.add('hidden');
    renderSummary();
    if (focus) {
      steps[index].querySelector<HTMLElement>('legend')?.focus({ preventScroll: true });
      const top = root.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > top + 40 || window.scrollY < top - 200) window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const stepError = (step: HTMLElement, message: string) => {
    const el = step.querySelector<HTMLElement>('[data-step-error]');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('hidden', !message);
  };

  const validateStep = (step: HTMLElement): boolean => {
    stepError(step, '');
    if (step === pathStep) return !!path;
    if (step === contactStep) return true;
    for (const q of step.querySelectorAll<HTMLElement>('[data-question]')) {
      if (q.dataset.required !== 'true') continue;
      if (q.dataset.type === 'single' && !q.querySelector('input:checked')) {
        stepError(step, 'Please pick an option to continue.');
        q.querySelector<HTMLInputElement>('input')?.focus();
        return false;
      }
      if (q.dataset.type === 'city') {
        const input = q.querySelector<HTMLInputElement>('input')!;
        if (input.value.trim().length < 2) {
          stepError(step, 'Please add the city or town so we know where the project is.');
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return false;
        }
        input.removeAttribute('aria-invalid');
      }
    }
    return true;
  };

  const go = (delta: number) => {
    const steps = stepsFor(path);
    if (delta > 0) {
      if (!validateStep(steps[index])) return;
      if (index > maxTracked) {
        maxTracked = index;
        track(`quote_step_${index}`, { step: index, step_name: steps[index].dataset.name || 'path', path: path || '' });
      }
      if (index === 0 && maxTracked === 0) {
        maxTracked = 0;
        track('quote_step_0', { step: 0, step_name: 'path', path: path || '' });
      }
    }
    index = Math.max(0, Math.min(steps.length - 1, index + delta));
    save();
    show();
  };

  nextBtn.addEventListener('click', () => go(1));
  backBtn.addEventListener('click', () => go(-1));

  form.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!started) {
      started = true;
      track('quote_start', { path: path || input.value, form: 'wizard' });
    }
    if (input.name === 'path') {
      path = input.value as InquiryPath;
      index = 0;
      save();
      window.setTimeout(() => go(1), 160);
      return;
    }
    save();
    renderSummary();
    // A step with a single required choice advances on its own.
    const step = current();
    const questions = step.querySelectorAll('[data-question]');
    if (input.type === 'radio' && questions.length === 1 && step !== contactStep) window.setTimeout(() => go(1), 200);
  });

  // Enter moves forward instead of submitting early.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && current() !== contactStep) {
      e.preventDefault();
      if (index > 0) go(1);
    }
  });

  /* ---------- city ---------- */
  const towns = [...document.querySelectorAll<HTMLOptionElement>('#towns option')].map((o) => ({ label: o.value.toLowerCase(), tier: o.dataset.tier }));
  form.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.name?.endsWith('.city')) return;
    const note = input.closest('.question')?.querySelector<HTMLElement>('[data-city-note]');
    if (!note) return;
    const v = input.value.trim().toLowerCase();
    const match = v.length > 2 ? towns.find((t) => t.label.startsWith(v) || v.startsWith(t.label.split(',')[0])) : null;
    let msg = '';
    if (v.length > 3 && !match) msg = 'That may be outside our usual area. Send it anyway and we will tell you straight whether we can take it on.';
    else if (match?.tier === 'project') msg = 'We take work there on a project basis. Send the details and we will confirm.';
    note.textContent = msg;
    note.classList.toggle('hidden', !msg);
    renderSummary();
  });

  /* ---------- files ---------- */
  const downscale = (file: File): Promise<LeadFile> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const data = c.toDataURL('image/jpeg', 0.8).split(',')[1];
        resolve({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  const readRaw = (file: File): Promise<LeadFile> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result).split(',')[1] });
      reader.onerror = () => reject(new Error('unreadable'));
      reader.readAsDataURL(file);
    });

  const renderFiles = () => {
    root.querySelectorAll<HTMLElement>('[data-file-list]').forEach((list) => {
      list.innerHTML = files.map((f, i) => `<li class="file-row"><span>${f.name.replace(/</g, '&lt;')}</span><button type="button" data-remove="${i}" aria-label="Remove ${f.name.replace(/"/g, '')}">Remove</button></li>`).join('');
    });
    renderSummary();
  };
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]');
    if (!btn) return;
    files.splice(Number(btn.dataset.remove), 1);
    track('file_upload', { action: 'remove', count: files.length });
    renderFiles();
  });
  root.querySelectorAll<HTMLInputElement>('[data-files]').forEach((input) => {
    input.addEventListener('change', async () => {
      const err = input.closest('.question')!.querySelector<HTMLElement>('[data-file-error]')!;
      err.classList.add('hidden');
      const problems: string[] = [];
      for (const file of [...(input.files || [])]) {
        if (files.length >= MAX_FILES) { problems.push(`Only ${MAX_FILES} files can be attached.`); break; }
        try {
          const lf = file.type.startsWith('image/') ? await downscale(file) : await readRaw(file);
          if (!['image/jpeg', 'application/pdf'].includes(lf.type)) { problems.push(`${file.name} is not a photo or PDF.`); continue; }
          if ((lf.data.length * 3) / 4 > MAX_FILE_BYTES) { problems.push(`${file.name} is too large. Try a photo or a smaller PDF.`); continue; }
          files.push(lf);
        } catch {
          problems.push(`${file.name} could not be read.`);
        }
      }
      input.value = '';
      if (problems.length) { err.textContent = problems.join(' '); err.classList.remove('hidden'); }
      track('file_upload', { action: 'add', count: files.length });
      renderFiles();
    });
  });

  /* ---------- submit ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!path || current() !== contactStep) return;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) || '').trim();
    const fail = (msg: string, field: string) => {
      stepError(contactStep, msg);
      const el = form.querySelector<HTMLInputElement>(`[name="${field}"]`);
      el?.setAttribute('aria-invalid', 'true');
      el?.focus();
    };
    contactStep.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    stepError(contactStep, '');
    if (get('name').length < 2) return fail('Please add your name.', 'name');
    if (get('phone').replace(/\D/g, '').length < 10) return fail('Please add a phone number with area code.', 'phone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(get('email'))) return fail('Please add an email address so we can send the drawing and quote.', 'email');

    const payload: LeadPayload = {
      form: 'wizard',
      path,
      contact: { name: get('name'), phone: get('phone'), email: get('email'), bestTime: get('bestTime'), city: cityInput()?.value.trim() || '' },
      answers: collect(),
      notes: get('notes'),
      attribution: getAttribution(),
      files,
      meta: { elapsedMs: Date.now() - startedAt, hp: get('company_website'), pageUrl: location.href, studio },
    };

    submitBtn.disabled = true;
    submitLabel.textContent = 'Sending';
    submitError.classList.add('hidden');
    const result = await submitLead(payload);
    if (result.ok) {
      track('quote_submit', { path, lead_score: result.score, lead_tier: result.tier, files: files.length });
      try {
        sessionStorage.removeItem(STORE);
        sessionStorage.setItem('igc_last_lead', JSON.stringify({ form: 'wizard', path, name: payload.contact.name.split(' ')[0], id: result.id }));
      } catch { /* ignore */ }
      location.href = `/thank-you/?type=quote&path=${path}`;
      return;
    }
    submitBtn.disabled = false;
    submitLabel.textContent = 'Send my request';
    track('form_error', { form: 'wizard', reason: result.code });
    if (result.field && ['name', 'phone', 'email'].includes(result.field)) return fail(result.error || 'Please check that field.', result.field);
    submitErrorText.textContent = result.error || 'We could not send that just now.';
    submitError.classList.remove('hidden');
    submitError.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  /* ---------- boot ---------- */
  restore();
  const qPath = query.get('path') as InquiryPath | null;
  if (qPath && qPath in inquiryPaths) {
    path = qPath;
    const radio = form.querySelector<HTMLInputElement>(`input[name="path"][value="${qPath}"]`);
    if (radio) radio.checked = true;
    index = 1;
  } else if (studio) {
    path = 'gates';
    form.querySelector<HTMLInputElement>('input[name="path"][value="gates"]')!.checked = true;
    index = 1;
  } else if (path) {
    form.querySelector<HTMLInputElement>(`input[name="path"][value="${path}"]`)!.checked = true;
  }
  const qType = query.get('type');
  if (qType && path) {
    const el = form.querySelector<HTMLInputElement>(`input[name="${path}.gateType"][value="${qType}"]`);
    if (el) el.checked = true;
  }
  show(false);
}
