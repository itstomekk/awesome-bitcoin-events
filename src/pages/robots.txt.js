// robots.txt, generated so the Sitemap line follows the site origin and base path.
//
// The list is dedicated to the public domain (CC0 1.0), so the Content-Signal line says
// everything may be used: search indexing, answering questions from it (ai-input) and
// training. These signals state intent; well-behaved crawlers follow them, others may not.
// Change `ai-train` to `no` here if that policy ever changes.
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes';

export function robotsTxt(sitemap) {
  return `User-agent: *\nAllow: /\nContent-Signal: ${CONTENT_SIGNAL}\n\nSitemap: ${sitemap}\n`;
}

export function GET({ site }) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const sitemap = site ? new URL(`${base}sitemap.xml`, site).href : `${base}sitemap.xml`;
  return new Response(robotsTxt(sitemap), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
