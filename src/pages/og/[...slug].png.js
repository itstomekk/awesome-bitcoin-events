// One 1200x630 link-preview card per indexable page: og/events/<slug>.png, og/country/<x>.png ...
// Past events and noindex hubs are not shared as search results, so they use the default og.jpg.
import { getModel } from '../../lib/site-model.js';
import { renderCard } from '../../lib/og-card.js';

export function getStaticPaths() {
  return getModel().pages.filter((p) => p.indexable).map((page) => ({ params: { slug: page.path }, props: { og: page.og } }));
}

export async function GET({ props }) {
  const png = await renderCard(props.og);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
