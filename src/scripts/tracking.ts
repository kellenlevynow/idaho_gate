/**
 * Central tracking module. Every analytics call on the site goes through
 * `track()`, so the full event list can be audited in this one file.
 *
 * Events
 *   call_click        tel: link tapped             { location }
 *   email_click       mailto: link clicked         { location }
 *   cta_click         any [data-cta] element       { cta, location }
 *   quote_start       wizard first interaction     { path }
 *   quote_step_n      wizard step completed        { step, step_name, path }
 *   quote_submit      full quote delivered         { path, lead_score, lead_tier }
 *   form_submit       quick form delivered         { form, path }
 *   form_error        delivery failed              { form, reason }
 *   file_upload       file attached or removed     { action, count }
 *   studio_configure  gate studio option changed   { option, value }
 *   hero_stage        3D theater stage reached     { stage }
 *
 * Vendors are loaded only when their ID is set (see .env.example).
 * With a GTM ID, GTM owns GA4, Ads and Meta tags and this module only
 * pushes to dataLayer. Without GTM, GA4 / Ads / Meta are called directly.
 */
import { getAttribution } from './attribution';

type Params = Record<string, string | number | boolean | undefined>;

const cfg = window.__IGC__ || ({} as Window['__IGC__']);
window.dataLayer = window.dataLayer || [];

function gtag(..._args: unknown[]) {
  // gtag requires the arguments object itself on the dataLayer
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

let vendorsLoaded = false;
function loadScript(src: string) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Load vendor tags after first interaction or idle, never in the critical path. */
export function loadVendors() {
  if (vendorsLoaded) return;
  vendorsLoaded = true;
  if (cfg.gtmId) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtmId)}`);
  } else if (cfg.ga4Id || cfg.googleAdsId) {
    window.gtag = gtag;
    gtag('js', new Date());
    if (cfg.ga4Id) gtag('config', cfg.ga4Id);
    if (cfg.googleAdsId) gtag('config', cfg.googleAdsId);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4Id || cfg.googleAdsId)}`);
  }
  if (cfg.metaPixelId && !cfg.gtmId) {
    const fbq: any = function (...args: unknown[]) {
      fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.metaPixelId);
    fbq('track', 'PageView');
  }
  if (cfg.callTrackingScript) loadScript(cfg.callTrackingScript);
}

export function track(event: string, params: Params = {}) {
  const attribution = getAttribution();
  const payload = {
    event,
    ...params,
    page_path: location.pathname,
    service_interest: attribution.service_interest,
    utm_source: attribution.last_utm_source,
    utm_medium: attribution.last_utm_medium,
    utm_campaign: attribution.last_utm_campaign,
  };
  window.dataLayer.push(payload);

  if (!cfg.gtmId) {
    if (cfg.ga4Id) gtag('event', event, payload);
    if (cfg.googleAdsId) {
      if (event === 'quote_submit' && cfg.googleAdsLeadLabel) {
        gtag('event', 'conversion', { send_to: `${cfg.googleAdsId}/${cfg.googleAdsLeadLabel}` });
      }
      if (event === 'call_click' && cfg.googleAdsCallLabel) {
        gtag('event', 'conversion', { send_to: `${cfg.googleAdsId}/${cfg.googleAdsCallLabel}` });
      }
    }
    if (window.fbq) {
      if (event === 'quote_submit' || event === 'form_submit') window.fbq('track', 'Lead', params);
      else if (event === 'call_click') window.fbq('track', 'Contact', params);
      else if (event === 'quote_start') window.fbq('track', 'InitiateCheckout', params);
    }
  }
  // Local hook for QA and end-to-end tests.
  document.dispatchEvent(new CustomEvent('igc:track', { detail: payload }));
}

function locationOf(el: Element): string {
  return el.closest<HTMLElement>('[data-track-location]')?.dataset.trackLocation || 'body';
}

export function initTracking() {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      const link = target?.closest?.('a, button');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('tel:')) track('call_click', { location: locationOf(link) });
      else if (href.startsWith('mailto:')) track('email_click', { location: locationOf(link) });
      const cta = (link as HTMLElement).dataset.cta;
      if (cta) track('cta_click', { cta, location: locationOf(link) });
    },
    { capture: true },
  );

  const kick = () => loadVendors();
  if (cfg.gtmId || cfg.ga4Id || cfg.googleAdsId || cfg.metaPixelId || cfg.callTrackingScript) {
    ['pointerdown', 'keydown', 'scroll'].forEach((ev) =>
      window.addEventListener(ev, kick, { once: true, passive: true }),
    );
    setTimeout(kick, 3500);
  }
}
