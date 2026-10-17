// robots.txt, generated so the Sitemap line follows the site origin and base path.
export function GET({ site }) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const sitemap = site ? new URL(`${base}sitemap.xml`, site).href : `${base}sitemap.xml`;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
