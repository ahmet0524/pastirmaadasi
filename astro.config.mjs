import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pastirmaadasi.vercel.app', // veya kendi domain'iniz
  integrations: [sitemap()],
});