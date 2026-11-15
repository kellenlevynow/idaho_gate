/// <reference path="../.astro/types.d.ts" />
interface Window {
  dataLayer: unknown[];
  __IGC__: {
    gtmId: string; ga4Id: string; googleAdsId: string; googleAdsLeadLabel: string;
    googleAdsCallLabel: string; metaPixelId: string; callTrackingScript: string;
  };
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
  __gate?: any;
}
