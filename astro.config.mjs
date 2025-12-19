import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://simplebytes.com',
  integrations: [sitemap()],
  build: {
    assets: '_assets'
  }
});
