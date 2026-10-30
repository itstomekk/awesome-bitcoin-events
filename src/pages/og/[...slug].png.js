// One 1200x630 link-preview card per indexable hub page: og/country/<x>.png, og/year/<y>.png ...
// Event pages with art get a richer card from [...slug].jpg.js instead. Past events without art and
// noindex hubs are not shared as search results, so they use the default og.jpg.
import { getModel } from '../../lib/site-model.js';
import { renderCard } from '../../lib/og-card.js';
import { hasEventCard } from '../../lib/event-card.js';

export function getStaticPaths() {
  return getModel().pages.filter((p) => p.indexable && !(p.kind === 'event' && hasEventCard(p.event.slug))).map((page) => ({ params: { slug: page.path }, props: { og: page.og } }));
}

export async function GET({ props }) {
  const png = await renderCard(props.og);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
