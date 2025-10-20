import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  output: 'server', // ÖNEMLİ: server mode
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  // API routes için özel ayarlar
  vite: {
    define: {
      'process.env.RESEND_API_KEY': JSON.stringify(process.env.RESEND_API_KEY),
      'process.env.IYZICO_API_KEY': JSON.stringify(process.env.IYZICO_API_KEY),
      'process.env.IYZICO_SECRET_KEY': JSON.stringify(process.env.IYZICO_SECRET_KEY),
    },
    ssr: {
      noExternal: ['resend', 'iyzipay']
    }
  }
});