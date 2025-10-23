import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  vite: {
    ssr: {
      // İyzipay'i external olarak işaretle (node_modules'den yüklensin)
      external: ['iyzipay'],
      // Resend'i noExternal olarak tut
      noExternal: ['resend']
    }
  }
});