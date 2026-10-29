// feed.xml: Atom feed of the next 50 upcoming events.
import { getModel } from '../lib/site-model.js';
import { atomFeed } from '../lib/pages-model.js';

export function GET() {
  return new Response(atomFeed(getModel()), { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
