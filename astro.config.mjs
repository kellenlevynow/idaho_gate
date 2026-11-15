// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Fully static site, hosted on Cloudflare Pages. The two server pieces live in
// functions/: the lead endpoint (/api/lead) and the preview password gate.
export default defineConfig({
  site: 'https://idahogate.com',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !/\/(thank-you|404|api)\/?$/.test(page) && !page.includes('/thank-you'),
    }),
  ],
  build: { format: 'directory', inlineStylesheets: 'auto' },
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 900, sourcemap: true },
  },
  devToolbar: { enabled: false },
});
