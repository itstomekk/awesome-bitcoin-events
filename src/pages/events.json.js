// events.json: the whole list (events and meetups) as open data, CC0.
import { getModel } from '../lib/site-model.js';
import { eventsJson } from '../lib/pages-model.js';

export function GET() {
  return new Response(eventsJson(getModel()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
