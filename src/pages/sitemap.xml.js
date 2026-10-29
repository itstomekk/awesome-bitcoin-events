// sitemap.xml: the home page plus every indexable generated page (upcoming events, country,
// year, type and meetup pages). Past events and archive-only hubs are noindex and left out.
// No <lastmod>: the list has no per-page edit date, and a build stamp would be misleading.
import { getModel } from '../lib/site-model.js';
import { sitemapXml } from '../lib/pages-model.js';

export function GET() {
  return new Response(sitemapXml(getModel()), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
