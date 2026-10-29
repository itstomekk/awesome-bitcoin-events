// One calendar file per event: events/<slug>/event.ics
import { getModel } from '../../lib/site-model.js';
import { eventIcs } from '../../lib/pages-model.js';

export function getStaticPaths() {
  return getModel().events.map((e) => ({ params: { slug: e.path }, props: { path: e.path } }));
}

export function GET({ props }) {
  const model = getModel();
  const event = model.events.find((e) => e.path === props.path);
  return new Response(eventIcs(event, { origin: model.ctx.origin, stamp: model.ctx.buildDay }), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
