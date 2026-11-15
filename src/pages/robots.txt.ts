import type { APIRoute } from 'astro';
import { site } from '@/site.config';

/** Blocks everything while the site is a preview build, opens up once PUBLIC_LAUNCH_READY=true. */
export const GET: APIRoute = () => {
  const body = site.launchReady
    ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /thank-you/\n\nSitemap: ${site.url}/sitemap-index.xml\n`
    : `# Preview build. Set PUBLIC_LAUNCH_READY=true to allow indexing.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
