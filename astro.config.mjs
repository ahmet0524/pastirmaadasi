import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Adapter EKLEMEYIN - statik olarak kalacak
export default defineConfig({
  site: 'https://pastirmaadasi.vercel.app',
  output: 'static', // Statik kalacak, CSS'ler bozulmayacak
  integrations: [sitemap()],
  // Build config
  build: {
    format: 'directory'
  }
});