/**
 * Attribution capture. First touch persists in localStorage, last touch in
 * sessionStorage. Both ride along with every lead and every tracked event.
 */
const PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid',
] as const;

export interface Touch {
  params: Record<string, string>;
  landing_page: string;
  referrer: string;
  ts: string;
}

const FIRST = 'igc_first_touch';
const LAST = 'igc_last_touch';
const SERVICE = 'igc_service_interest';

function read(store: Storage, key: string): Touch | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as Touch) : null;
  } catch {
    return null;
  }
}
function write(store: Storage, key: string, value: unknown) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: attribution degrades, the form still works */
  }
}

export function captureAttribution() {
  const q = new URLSearchParams(location.search);
  const params: Record<string, string> = {};
  for (const k of PARAMS) {
    const v = q.get(k);
    if (v) params[k] = v.slice(0, 200);
  }
  const touch: Touch = {
    params,
    landing_page: location.pathname + location.search,
    referrer: document.referrer || '',
    ts: new Date().toISOString(),
  };
  const hasParams = Object.keys(params).length > 0;
  try {
    if (!read(localStorage, FIRST)) write(localStorage, FIRST, touch);
    if (hasParams || !read(sessionStorage, LAST)) write(sessionStorage, LAST, touch);
    const service = document.body.dataset.service;
    if (service) sessionStorage.setItem(SERVICE, service);
  } catch {
    /* ignore */
  }
}

/** Flat key/value attribution for hidden form fields and event params. */
export function getAttribution(): Record<string, string> {
  const out: Record<string, string> = {};
  let first: Touch | null = null;
  let last: Touch | null = null;
  try {
    first = read(localStorage, FIRST);
    last = read(sessionStorage, LAST);
  } catch {
    /* ignore */
  }
  const put = (prefix: string, t: Touch | null) => {
    if (!t) return;
    for (const [k, v] of Object.entries(t.params)) out[`${prefix}_${k}`] = v;
    out[`${prefix}_landing_page`] = t.landing_page;
    out[`${prefix}_referrer`] = t.referrer;
    out[`${prefix}_ts`] = t.ts;
  };
  put('first', first);
  put('last', last);
  try {
    const s = sessionStorage.getItem(SERVICE);
    if (s) out.service_interest = s;
  } catch {
    /* ignore */
  }
  out.submit_page = location.pathname;
  return out;
}
