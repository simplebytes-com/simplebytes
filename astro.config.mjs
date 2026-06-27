import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://simplebytes.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/v/'),
  })],
  build: {
    assets: '_assets'
  }
});
