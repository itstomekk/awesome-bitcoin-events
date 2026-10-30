// One 1200x630 link-preview card per event that has committed art (src/og/art): og/events/<slug>.jpg.
// Past events get one too, so a shared link to any event carries its own image.
import { getModel } from '../../lib/site-model.js';
import { renderEventCard, hasEventCard } from '../../lib/event-card.js';

export function getStaticPaths() {
  return getModel().pages
    .filter((p) => p.kind === 'event' && hasEventCard(p.event.slug))
    .map((page) => ({ params: { slug: page.path }, props: { event: page.event } }));
}

export async function GET({ props }) {
  const jpg = await renderEventCard(props.event);
  return new Response(jpg, { headers: { 'Content-Type': 'image/jpeg' } });
}
