import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pastirmaadasi.vercel.app',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap()],
});
