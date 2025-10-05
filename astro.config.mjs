import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pastirmaadasi.netlify.app',
  integrations: [sitemap()],
  // output ve adapter yok - static site
});