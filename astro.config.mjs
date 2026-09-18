import { defineConfig } from 'astro/config';

// GitHub project pages serve from /awesome-bitcoin-events. Override the base path
// locally or for a custom domain with PUBLIC_BASE_PATH when that changes.
export default defineConfig({
  site: 'https://itstomekk.github.io',
  base: process.env.PUBLIC_BASE_PATH || '/',
  output: 'static',
  build: {
    format: 'directory'
  }
});
