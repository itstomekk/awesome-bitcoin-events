// calendar.ics: subscribe to every upcoming event in a calendar app (webcal://).
import { getModel } from '../lib/site-model.js';
import { calendarIcs } from '../lib/pages-model.js';

export function GET() {
  return new Response(calendarIcs(getModel()), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
}
