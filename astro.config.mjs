// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Static site with one on-demand route (/api/lead) served as a Netlify Function.
export default defineConfig({
  site: 'https://idahogate.com',
  output: 'static',
  adapter: netlify(),
  integrations: [
    sitemap({
      filter: (page) => !/\/(thank-you|404|api)\/?$/.test(page) && !page.includes('/thank-you'),
    }),
  ],
  build: { format: 'directory', inlineStylesheets: 'auto' },
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 900 },
  },
  devToolbar: { enabled: false },
});
