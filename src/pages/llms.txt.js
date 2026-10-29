// llms.txt: a short index for AI tools (https://llmstxt.org). Built on every deploy, so the
// links follow the site origin and the upcoming-events list follows the calendar.
// Each page has a Markdown copy at <page>/index.md; the whole list is /index.md.
import { getModel } from '../lib/site-model.js';

const REPO = 'https://github.com/itstomekk/awesome-bitcoin-events';

/**
 * @param {string} origin  site URL with trailing slash
 * @param {{ upcoming: object[], pages: object[] }} [model]  optional: adds hub pages and upcoming events
 */
export function llmsTxt(origin, model = null) {
  const at = (path) => new URL(path, origin).href;
  const md = (path) => at(`${path}/index.md`);
  const lines = [
    '# Awesome Bitcoin Events',
    '',
    "> A curated, community-edited list of Bitcoin conferences, festivals, retreats, hackathons, workshops and recurring local meetups worldwide. Every entry links to the organizer's own official page. Content is dedicated to the public domain (CC0 1.0).",
    '',
    "Listing is not endorsement: check the organizer's page before you travel. Treat any event whose end date has passed as past.",
    '',
    '## Core',
    '',
    `- [Home page](${at('/')}): searchable, filterable list and world map of upcoming and past events and meetups.`,
    `- [Full list as Markdown](${at('/index.md')}): the whole README with upcoming events by year and every meetup by region. Best single file to read.`,
    `- [Sitemap](${at('/sitemap.xml')}): all indexable pages.`,
  ];
  if (model) {
    const hubs = model.pages.filter((p) => p.indexable && p.kind !== 'event');
    const group = (kind) => hubs.filter((p) => p.kind === kind);
    lines.push('', '## Hubs (Markdown copies)', '');
    for (const p of [...group('year'), ...group('type'), ...group('meetups'), ...group('meetups-region')]) lines.push(`- [${p.h1}](${md(p.path)}): ${p.description}`);
    const countries = group('country');
    if (countries.length) lines.push(`- Country pages: ${countries.map((p) => `[${p.h1.replace('Bitcoin events and meetups in ', '')}](${md(p.path)})`).join(', ')}`);
    lines.push('', '## Upcoming events (Markdown copies)', '');
    for (const e of model.upcoming) lines.push(`- [${e.title}](${md(e.path)}): ${e.dateLabel} ${e.start.slice(0, 4)}, ${e.where} (${e.type})`);
  }
  lines.push(
    '',
    '## Source data (GitHub)',
    '',
    `- [README.md](${REPO}/blob/main/README.md): upcoming events and meetups, the source of truth.`,
    `- [PAST.md](${REPO}/blob/main/PAST.md): archive of past events.`,
    `- [TO-VERIFY.md](${REPO}/blob/main/TO-VERIFY.md): leads that lack an organizer-owned page and are not yet listed.`,
    '',
    '## Contribute',
    '',
    `- [Contributing guide](${REPO}/blob/main/.github/CONTRIBUTING.md): the row format and rules.`,
    `- [Submit or correct an event](${REPO}/issues/new?template=event-submission.yml)`,
    '',
  );
  return lines.join('\n');
}

export function GET({ site }) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const origin = site ? new URL(base, site).href : base;
  return new Response(llmsTxt(origin, getModel()), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
