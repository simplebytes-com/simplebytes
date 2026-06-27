import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://simplebytes.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/v/') && !page.includes('/404'),
  })],
  build: {
    assets: '_assets'
  }
});
