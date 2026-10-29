// Astro build settings: a fully static site (no server) written to ./dist and deployed
// to GitHub Pages by .github/workflows/pages.yml.
import { defineConfig } from 'astro/config';

// Served at the root of the custom domain awesomebitcoinevents.com (GitHub Pages).
// Override the base path with PUBLIC_BASE_PATH only for a sub-path preview.
export default defineConfig({
  site: 'https://awesomebitcoinevents.com',
  base: process.env.PUBLIC_BASE_PATH || '/',
  output: 'static',
  build: {
    format: 'directory'
  }
});
