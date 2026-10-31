// sitemap.xml: the home page plus every indexable generated page (upcoming events, country,
// year, type and meetup pages). Past events and archive-only hubs are noindex and left out.
// No <lastmod>: the list has no per-page edit date, and a build stamp would be misleading.
import { getModel } from '../lib/site-model.js';
import { sitemapXml } from '../lib/pages-model.js';

// Hand-written pages that are not generated from the list (src/pages/bitcoin-whitepaper.astro).
const STATIC_PATHS = ['bitcoin-whitepaper'];

export function GET() {
  return new Response(sitemapXml(getModel(), STATIC_PATHS), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
