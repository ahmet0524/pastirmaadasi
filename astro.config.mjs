import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: vercel(),

  security: {
    checkOrigin: false
  },

  integrations: [react()]
});