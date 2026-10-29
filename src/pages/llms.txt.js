// llms.txt: a short index for AI tools (https://llmstxt.org). Built on every deploy so the
// links follow the site origin. The full list is the Markdown copy at /index.md.
const REPO = 'https://github.com/itstomekk/awesome-bitcoin-events';

export function llmsTxt(origin) {
  const at = (path) => new URL(path, origin).href;
  return `# Awesome Bitcoin Events

> A curated, community-edited list of Bitcoin conferences, festivals, retreats, hackathons, workshops and recurring local meetups worldwide. Every entry links to the organizer's own official page. Content is dedicated to the public domain (CC0 1.0).

Listing is not endorsement: check the organizer's page before you travel. Upcoming and past events are decided by date, so treat any event whose end date has passed as past.

## Core

- [Home page](${at('/')}): searchable, filterable list and world map of upcoming and past events and meetups.
- [Full list as Markdown](${at('/index.md')}): the whole README with upcoming events by year and every meetup by region. Best single file to read.
- [Sitemap](${at('/sitemap.xml')}): all indexable pages.

## Source data (GitHub)

- [README.md](${REPO}/blob/main/README.md): upcoming events and meetups, the source of truth.
- [PAST.md](${REPO}/blob/main/PAST.md): archive of past events.
- [TO-VERIFY.md](${REPO}/blob/main/TO-VERIFY.md): leads that lack an organizer-owned page and are not yet listed.

## Contribute

- [Contributing guide](${REPO}/blob/main/.github/CONTRIBUTING.md): the row format and rules.
- [Submit or correct an event](${REPO}/issues/new?template=event-submission.yml)
`;
}

export function GET({ site }) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const origin = site ? new URL(base, site).href : base;
  return new Response(llmsTxt(origin), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
