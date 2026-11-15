/**
 * Single source of truth for brand, contact and tracking.
 * No component hardcodes a phone number, email or brand name.
 *
 * Anything flagged `placeholder: true` is NOT a real business fact.
 * Replace it, then set PUBLIC_LAUNCH_READY=true. See TODO-CONTENT.md.
 */

// Also imported by the Cloudflare Pages Function, where import.meta.env does not exist.
const env: Record<string, string | undefined> = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const site = {
  name: 'Idaho Gate Co.',
  legalName: 'Idaho Gate Co.', // TODO(owner): confirm legal entity name
  shortName: 'Idaho Gate',
  domain: 'idahogate.com',
  url: 'https://idahogate.com',
  tagline: 'Custom gates and metal fabrication, designed and built in North Idaho.',
  description:
    'Idaho Gate Co. designs, fabricates and installs custom driveway gates, automated entry systems and architectural metalwork across North Idaho and the Inland Northwest.',

  /** Formerly operated as, used once on the about page and in schema. */
  formerName: 'Idaho Fortified Gate & Fence Co.',

  contact: {
    // PLACEHOLDER. 555-01xx numbers are reserved and never ring a real line.
    phoneDisplay: '(208) 555-0142',
    phoneTel: '+12085550142',
    phonePlaceholder: true,
    // PLACEHOLDER. Confirm the lead inbox before launch.
    email: 'quotes@idahogate.com',
    emailPlaceholder: true,
    // Service-area business. No street address is published until the owner supplies one.
    region: 'North Idaho',
    state: 'ID',
    country: 'US',
    hours: 'Monday to Friday, 7am to 5pm', // TODO(owner): confirm
    hoursPlaceholder: true,
    /** Shown on the thank-you page and near forms. TODO(owner): confirm. */
    responseTime: 'one business day',
  },

  /**
   * Owner note for the about page. Hidden until filled in, so the site
   * never shows a placeholder person. TODO(owner): name, role, a few lines.
   */
  owner: { name: '', role: '', note: '' },

  social: {
    // Old handles from the previous brand. Left empty until confirmed.
    facebook: '',
    instagram: '',
    googleBusinessProfile: '',
  },

  /**
   * Trust facts. Each stays hidden on the site until the owner confirms it,
   * so the site never claims a licence, warranty or review it cannot back up.
   */
  trust: {
    idahoContractorRegistration: '', // e.g. "RCE-12345"
    washingtonContractorRegistration: '',
    insured: false,
    warrantySummary: '',
    yearsInBusiness: null as number | null,
    automationBrands: ['LiftMaster', 'DoorKing'], // from the previous site, confirm
    automationBrandsConfirmed: false,
  },

  tracking: {
    gtmId: (env.PUBLIC_GTM_ID as string) || '',
    ga4Id: (env.PUBLIC_GA4_ID as string) || '',
    googleAdsId: (env.PUBLIC_GOOGLE_ADS_ID as string) || '',
    googleAdsLeadLabel: (env.PUBLIC_GOOGLE_ADS_LEAD_LABEL as string) || '',
    googleAdsCallLabel: (env.PUBLIC_GOOGLE_ADS_CALL_LABEL as string) || '',
    metaPixelId: (env.PUBLIC_META_PIXEL_ID as string) || '',
    callTrackingScript: (env.PUBLIC_CALL_TRACKING_SCRIPT as string) || '',
  },

  /** When false every page is noindex and the footer carries a preview note. */
  launchReady: env.PUBLIC_LAUNCH_READY === 'true',
} as const;

export type ServiceTier = 'core' | 'extended' | 'project';

export interface ServiceTown {
  name: string;
  state: 'ID' | 'WA' | 'MT';
  county: string;
  lat: number;
  lon: number;
  tier: ServiceTier;
  /** slug of a dedicated page in src/content/areas, when one exists */
  page?: string;
}

/**
 * Service geography. Tiers describe how we talk about a place, not a promise:
 *  core     = day-to-day service territory
 *  extended = regular work, scheduled by route
 *  project  = taken on a project basis, confirm on the first call
 * TODO(owner): confirm every tier against real crew capacity and state registrations.
 */
export const serviceTowns: ServiceTown[] = [
  { name: "Coeur d'Alene", state: 'ID', county: 'Kootenai', lat: 47.678, lon: -116.78, tier: 'core', page: 'coeur-d-alene' },
  { name: 'Post Falls', state: 'ID', county: 'Kootenai', lat: 47.718, lon: -116.951, tier: 'core', page: 'post-falls' },
  { name: 'Hayden', state: 'ID', county: 'Kootenai', lat: 47.766, lon: -116.787, tier: 'core', page: 'hayden' },
  { name: 'Rathdrum', state: 'ID', county: 'Kootenai', lat: 47.812, lon: -116.896, tier: 'core', page: 'rathdrum' },
  { name: 'Spirit Lake', state: 'ID', county: 'Kootenai', lat: 47.966, lon: -116.868, tier: 'core' },
  { name: 'Athol', state: 'ID', county: 'Kootenai', lat: 47.948, lon: -116.708, tier: 'core' },
  { name: 'Harrison', state: 'ID', county: 'Kootenai', lat: 47.454, lon: -116.785, tier: 'extended' },
  { name: 'Sandpoint', state: 'ID', county: 'Bonner', lat: 48.277, lon: -116.553, tier: 'extended', page: 'sandpoint' },
  { name: 'Priest River', state: 'ID', county: 'Bonner', lat: 48.181, lon: -116.911, tier: 'extended', page: 'priest-river' },
  { name: 'Bonners Ferry', state: 'ID', county: 'Boundary', lat: 48.691, lon: -116.316, tier: 'extended', page: 'bonners-ferry' },
  { name: 'Kellogg', state: 'ID', county: 'Shoshone', lat: 47.538, lon: -116.119, tier: 'extended', page: 'silver-valley' },
  { name: 'Wallace', state: 'ID', county: 'Shoshone', lat: 47.474, lon: -115.928, tier: 'extended' },
  { name: 'St. Maries', state: 'ID', county: 'Benewah', lat: 47.314, lon: -116.563, tier: 'extended' },
  { name: 'Spokane', state: 'WA', county: 'Spokane', lat: 47.659, lon: -117.426, tier: 'extended', page: 'spokane' },
  { name: 'Spokane Valley', state: 'WA', county: 'Spokane', lat: 47.673, lon: -117.239, tier: 'extended' },
  { name: 'Liberty Lake', state: 'WA', county: 'Spokane', lat: 47.676, lon: -117.118, tier: 'extended' },
  { name: 'Newport', state: 'WA', county: 'Pend Oreille', lat: 48.18, lon: -117.043, tier: 'extended' },
  { name: 'Deer Park', state: 'WA', county: 'Spokane', lat: 47.954, lon: -117.477, tier: 'project' },
  { name: 'Cheney', state: 'WA', county: 'Spokane', lat: 47.487, lon: -117.576, tier: 'project' },
  { name: 'Moscow', state: 'ID', county: 'Latah', lat: 46.732, lon: -117.0, tier: 'project' },
  { name: 'Thompson Falls', state: 'MT', county: 'Sanders', lat: 47.597, lon: -115.343, tier: 'project' },
  { name: 'Libby', state: 'MT', county: 'Lincoln', lat: 48.388, lon: -115.556, tier: 'project' },
];

export const tierLabels: Record<ServiceTier, string> = {
  core: 'Core service area',
  extended: 'Extended service area',
  project: 'By project',
};
