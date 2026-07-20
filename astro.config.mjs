// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

// https://astro.build
export default defineConfig({
  output: 'server',
  adapter: process.env.DOCKER_BUILD
    ? node({ mode: 'standalone' })
    : vercel({
        webAnalytics: { enabled: true }
      }),
  session: {
    driver: import.meta.env.DEV
      ? sessionDrivers.fs()
      : sessionDrivers.redis({
          url: process.env.REDIS_URL
        }),
    cookie: {
      name: "icart-session",
      sameSite: "lax",
      secure: import.meta.env.PROD
    }
  }
});