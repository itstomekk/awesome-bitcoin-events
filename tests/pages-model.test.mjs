// The generated pages: slugs, indexing rules, calendar files, JSON-LD and Markdown copies
// (src/lib/pages-model.js). Uses the real README.md and PAST.md, so a malformed or colliding
// row fails here as well as in `npm run check`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, assignSlugs, registrableDomain, eventIcs, googleCalendarUrl, pageLd, pageMarkdown, sitemapXml } from '../src/lib/pages-model.js';
import { cardText } from '../src/lib/og-card.js';

const origin = 'https://example.org/';
const model = buildModel({ origin, buildDay: '2026-10-29' });

test('slugs are unique, URL-safe and stable for equal titles', () => {
  const slugs = model.events.map((e) => e.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)));
  const two = assignSlugs([
    { title: 'Same Name', start: '2026-01-01' },
    { title: 'Same Name', start: '2027-01-01' },
    { title: 'Other', start: '2026-02-01' },
  ]);
  assert.deepEqual(two, ['same-name-2026', 'same-name-2027', 'other']);
});

test('only upcoming events are indexable, and only indexable pages reach the sitemap', () => {
  for (const page of model.pages.filter((p) => p.kind === 'event')) {
    assert.equal(page.indexable, page.event.end >= '2026-10-29', page.path);
  }
  const xml = sitemapXml(model);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 1 + model.pages.filter((p) => p.indexable).length);
  assert.ok(locs.every((l) => l.startsWith(origin) && l.endsWith('/')));
  assert.equal(new Set(locs).size, locs.length);
  const past = model.pages.find((p) => p.kind === 'event' && !p.indexable);
  assert.ok(!xml.includes(`${origin}${past.path}/`));
});

test('every page has a unique title, a description within 160 characters and a canonical path', () => {
  const titles = new Set();
  for (const page of model.pages) {
    assert.ok(page.title && !titles.has(page.title), `duplicate title: ${page.title}`);
    titles.add(page.title);
    assert.ok(page.description.length > 30 && page.description.length <= 160, `${page.path}: ${page.description.length}`);
    assert.ok(page.crumbs.at(-1).path === page.path, page.path);
  }
});

test('hub pages exist for countries, years, types and meetup regions', () => {
  const kinds = new Set(model.pages.map((p) => p.kind));
  for (const kind of ['event', 'country', 'year', 'type', 'meetups', 'meetups-region']) assert.ok(kinds.has(kind), kind);
  assert.ok(model.pages.some((p) => p.path === 'meetups' && p.meetups.length === model.meetups.length));
});

test('calendar file: all-day event, exclusive end date, escaped and folded lines', () => {
  const ics = eventIcs({ slug: 'x', title: 'A, B; C', where: 'Zürich, Switzerland', url: 'https://x.org/' + 'a'.repeat(120), type: 'Conference', start: '2026-12-30', end: '2026-12-31' }, { origin, stamp: '2026-10-29' });
  assert.match(ics, /DTSTART;VALUE=DATE:20261230\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20270101\r\n/);
  assert.match(ics, /SUMMARY:A\\, B\\; C\r\n/);
  assert.ok(ics.split('\r\n').every((line) => Buffer.byteLength(line) <= 75));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(googleCalendarUrl({ title: 'T', start: '2026-12-30', end: '2026-12-31', where: 'W', type: 'Conference', url: 'https://x.org/' }), /dates=20261230%2F20270101/);
});

test('event JSON-LD points at the page, keeps the organizer link and uses absolute URLs', () => {
  const page = model.pages.find((p) => p.kind === 'event' && p.indexable);
  const ld = pageLd(page, model.ctx);
  const event = ld['@graph'].find((n) => n['@type'] === 'Event');
  assert.equal(event.url, `${origin}${page.path}/`);
  assert.equal(event.sameAs, page.event.url);
  assert.ok(event.image.every((i) => /^https?:/.test(i)));
  assert.equal(ld['@graph'].find((n) => n['@type'] === 'BreadcrumbList').itemListElement.length, page.crumbs.length);
});

test('Markdown copy names the official page and every link is absolute', () => {
  const page = model.pages.find((p) => p.kind === 'event' && p.indexable);
  const md = pageMarkdown(page, model.ctx);
  assert.match(md, new RegExp(`^# ${page.event.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n`));
  assert.ok(md.includes(`Official page: ${page.event.url}`));
  assert.doesNotMatch(md, /\]\((?!https?:)/);
});

test('registrableDomain groups editions of one organizer', () => {
  assert.equal(registrableDomain('https://2026.example.org/x'), 'example.org');
  assert.equal(registrableDomain('https://www.example.co.uk/'), 'example.co.uk');
});

test('card text swaps the Bitcoin sign and strips glyphs the fonts lack', () => {
  assert.equal(cardText('Plan ₿ Forum'), 'Plan B Forum');
  assert.equal(cardText('Bitcoin Histórico'), 'Bitcoin Histórico');
  assert.equal(cardText('Bitcoin 比特币'), 'Bitcoin');
});
