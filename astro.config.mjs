import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import { fileURLToPath } from 'url';
import path from 'path';

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
      noExternal: ['resend', 'iyzipay']
    },
    define: {
      '__dirname': JSON.stringify(path.dirname(fileURLToPath(import.meta.url)))
    },
    resolve: {
      alias: {
        'path': 'path-browserify',
        'crypto': 'crypto-browserify',
        'stream': 'stream-browserify'
      }
    }
  }
});