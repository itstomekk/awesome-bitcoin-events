// The site model: every page the website generates besides the home page, built from the
// same parsed list (README.md + PAST.md) the home page uses. Pure functions, no Astro APIs,
// so it is unit-tested (tests/pages-model.test.mjs) and shared by:
//   - src/pages/[...slug].astro        HTML pages (event, country, year, type, meetups)
//   - src/pages/[...slug]/index.md.js  Markdown copies for AI tools
//   - src/pages/[...slug]/event.ics.js one calendar file per event
//   - src/pages/og/[...slug].png.js    1200x630 link-preview cards
//   - src/pages/sitemap.xml.js, llms.txt.js
//
// Rule for what search engines may index: a page is `indexable` only while it has something
// current to say (an upcoming event, or at least one meetup). Past events and archive-only
// hubs stay reachable and linked, but are marked noindex and left out of the sitemap, so the
// index holds no thin pages. The site is rebuilt daily so this follows the calendar.
import { slugify, EVENT_TYPES } from './awesome-list.js';
import { loadEvents, loadMeetups, loadDetails, loadPlaces } from './load-list.js';

export const REPO = 'https://github.com/itstomekk/awesome-bitcoin-events';
export const SITE_NAME = 'Awesome Bitcoin Events';

const day = (iso) => new Date(`${iso}T12:00:00Z`);
const longDate = (iso) => day(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthName = (iso) => day(iso).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function fullDates(event) {
  return event.start === event.end ? longDate(event.start) : `${longDate(event.start)} – ${longDate(event.end)}`;
}

function clip(text, max) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[ ,;:.–-]+$/, '')}…`;
}

// "co.uk"-style suffixes are rare in this list; this is enough to group editions of one organizer.
export function registrableDomain(url) {
  try {
    const parts = new URL(url).hostname.toLowerCase().replace(/^www\./, '').split('.');
    const second = parts.at(-2);
    return parts.length > 2 && ['co', 'com', 'org', 'net', 'gov'].includes(second) && parts.at(-1).length === 2
      ? parts.slice(-3).join('.')
      : parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

// Short, stable, unique slugs: title first, then title-year, then title-start-date.
export function assignSlugs(events) {
  const count = new Map();
  const base = events.map((e) => slugify(e.title) || 'event');
  base.forEach((s) => count.set(s, (count.get(s) || 0) + 1));
  const used = new Set();
  return events.map((e, i) => {
    let slug = base[i];
    if (count.get(slug) > 1) slug = `${slug}-${e.start.slice(0, 4)}`;
    if (used.has(slug)) slug = `${slug}-${e.start}`;
    let n = 2;
    const root = slug;
    while (used.has(slug)) slug = `${root}-${n++}`;
    used.add(slug);
    return slug;
  });
}

// --- calendar helpers ---------------------------------------------------------------
const compact = (iso) => iso.replaceAll('-', '');
const nextDay = (iso) => new Date(day(iso).getTime() + 86400000).toISOString().slice(0, 10);
const icsEscape = (value) => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

// RFC 5545: lines are folded at 75 octets with CRLF + space.
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1; // never split a UTF-8 character
    out.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
    limit = 74;
  }
  return out.join('\r\n ');
}

function veventLines(event, { origin, stamp }) {
  return [
    'BEGIN:VEVENT',
    `UID:${event.slug}-${event.start}@${new URL(origin).hostname}`,
    `DTSTAMP:${compact(stamp)}T000000Z`,
    `DTSTART;VALUE=DATE:${compact(event.start)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(event.end))}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(event.where)}`,
    `URL:${event.url}`,
    `DESCRIPTION:${icsEscape(`${event.type} in ${event.where}. Official page: ${event.url}`)}`,
    'END:VEVENT',
  ];
}

const calendarWrap = (body, extra = []) => `${['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${SITE_NAME}//EN`, 'CALSCALE:GREGORIAN', ...extra, ...body, 'END:VCALENDAR'].map(fold).join('\r\n')}\r\n`;

// One event: events/<slug>/event.ics
export function eventIcs(event, opts) {
  return calendarWrap(veventLines(event, opts));
}

// Subscribable calendar of every upcoming event: calendar.ics. The same UIDs as the per-event
// files, so a calendar app that has both does not duplicate an event.
export function calendarIcs(model) {
  const opts = { origin: model.ctx.origin, stamp: model.ctx.buildDay };
  return calendarWrap(model.upcoming.flatMap((e) => veventLines(e, opts)), [
    `X-WR-CALNAME:${SITE_NAME}`,
    'X-WR-CALDESC:Upcoming Bitcoin conferences, festivals, retreats and workshops worldwide',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:PT24H',
  ]);
}

export function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${compact(event.start)}/${compact(nextDay(event.end))}`,
    location: event.where,
    details: `${event.type} in ${event.where}. Official page: ${event.url}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// --- the model ----------------------------------------------------------------------
/**
 * @param {{ root?: string, origin: string, buildDay: string }} options
 *   origin is the absolute site URL including the base path, with a trailing slash.
 */
export function buildModel({ root = process.cwd(), origin, buildDay }) {
  const { events: parsed } = loadEvents(root);
  const meetups = loadMeetups(root).meetups;
  const details = loadDetails(root);
  const places = loadPlaces(root);

  const sorted = [...parsed].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  const slugs = assignSlugs(sorted);
  const events = sorted.map((e, i) => {
    const past = e.end < buildDay;
    return {
      ...e,
      slug: slugs[i],
      path: `events/${slugs[i]}`,
      past,
      indexable: !past,
      detail: details[e.url] || null,
      domain: registrableDomain(e.url),
    };
  });
  const upcoming = events.filter((e) => !e.past);
  const urlOf = (path) => new URL(path ? `${path}/` : '', origin).href;
  const ctx = { origin, buildDay, urlOf };

  const pages = [];
  const countryNames = [...new Set([...events.map((e) => e.country), ...meetups.map((m) => m.country)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en'));
  const countrySlug = new Map(countryNames.map((c) => [c, slugify(c)]));

  // Event pages ---------------------------------------------------------------------
  for (const e of events) {
    const sameCountry = e.country ? upcoming.filter((o) => o.country === e.country && o !== e) : [];
    const sameMonth = events.filter((o) => o !== e && !o.past && o.start.slice(0, 7) === e.start.slice(0, 7) && o.country !== e.country);
    const editions = events.filter((o) => o !== e && o.domain && o.domain === e.domain);
    const localMeetups = e.country ? meetups.filter((m) => m.country === e.country) : [];
    const kind = e.type.toLowerCase();
    const where = e.online ? 'online' : `in ${e.where}`;
    // Organizer blurbs like "More details coming soon!" say nothing: fall back to the template.
    const blurb = e.detail?.description;
    const useful = blurb && blurb.length >= 40 && !/coming soon|tba|to be announced/i.test(blurb);
    const descriptionText = useful
      ? clip(blurb, 158)
      : clip(`${e.title}: Bitcoin ${kind} ${where}, ${e.dateLabel} ${e.start.slice(0, 4)}. Dates, location, calendar file and the organizer's official page.`, 158);
    pages.push({
      kind: 'event',
      path: e.path,
      event: e,
      title: `${e.title} · ${e.dateLabel} ${e.start.slice(0, 4)}, ${e.where} | ${SITE_NAME}`,
      description: descriptionText,
      lead: useful ? blurb : `${e.type} ${where}, ${e.dateLabel} ${e.start.slice(0, 4)}.`,
      h1: e.title,
      indexable: e.indexable,
      crumbs: [{ name: 'Home', path: '' }, { name: `${e.start.slice(0, 4)} events`, path: `year/${e.start.slice(0, 4)}` }, { name: e.title, path: e.path }],
      og: { kicker: `${e.type} · ${e.start.slice(0, 4)}`, title: e.title, line: `${e.dateLabel} · ${e.where}` },
      related: {
        editions: editions.slice(0, 8),
        sameCountry: sameCountry.slice(0, 6),
        sameMonth: sameMonth.slice(0, 6),
        meetups: localMeetups.slice(0, 6),
        meetupCount: localMeetups.length,
        countrySlug: e.country ? countrySlug.get(e.country) : null,
      },
    });
  }

  // Listing pages -------------------------------------------------------------------
  const listing = ({ kind, path, title, h1, description, intro, evs, mts, crumbs, og }) => ({
    kind,
    path,
    title,
    h1,
    description: clip(description, 158),
    intro,
    events: evs.filter((e) => !e.past),
    pastEvents: [...evs.filter((e) => e.past)].reverse(),
    meetups: mts,
    indexable: evs.some((e) => !e.past) || mts.length > 0,
    crumbs: [{ name: 'Home', path: '' }, ...crumbs],
    og,
  });

  for (const country of countryNames) {
    const evs = events.filter((e) => e.country === country);
    const mts = meetups.filter((m) => m.country === country);
    const nUp = evs.filter((e) => !e.past).length;
    const bits = [];
    if (nUp) bits.push(`${plural(nUp, 'upcoming Bitcoin event')}`);
    if (mts.length) bits.push(plural(mts.length, 'recurring meetup'));
    if (!bits.length) bits.push(`${plural(evs.length, 'past Bitcoin event')}`);
    pages.push(listing({
      kind: 'country',
      path: `country/${countrySlug.get(country)}`,
      title: `Bitcoin Events & Meetups in ${country} | ${SITE_NAME}`,
      h1: `Bitcoin events and meetups in ${country}`,
      description: `${bits.join(' and ')} in ${country}. Dates, cities and links to the organizers' official pages.`,
      intro: `${bits.join(' and ')} in ${country}, each linking to the organizer's own page.`,
      evs, mts,
      crumbs: [{ name: country, path: `country/${countrySlug.get(country)}` }],
      og: { kicker: 'Bitcoin events', title: country, line: bits.join(' · ') },
    }));
  }

  const years = [...new Set(events.map((e) => e.start.slice(0, 4)))].sort().reverse();
  for (const year of years) {
    const evs = events.filter((e) => e.start.slice(0, 4) === year);
    const nUp = evs.filter((e) => !e.past).length;
    const countries = new Set(evs.map((e) => e.country).filter(Boolean)).size;
    pages.push(listing({
      kind: 'year',
      path: `year/${year}`,
      title: `Bitcoin Conferences & Events ${year}: Dates and Cities | ${SITE_NAME}`,
      h1: `Bitcoin events in ${year}`,
      description: `${plural(evs.length, 'Bitcoin event')} in ${year} across ${plural(countries, 'country', 'countries')}: conferences, festivals, retreats and workshops, with dates, cities and official links.`,
      intro: `${plural(evs.length, 'Bitcoin event')} in ${year} across ${plural(countries, 'country', 'countries')}${nUp ? `, ${nUp} of them still ahead` : ''}.`,
      evs, mts: [],
      crumbs: [{ name: `${year} events`, path: `year/${year}` }],
      og: { kicker: 'Bitcoin events', title: String(year), line: `${plural(evs.length, 'event')} · ${plural(countries, 'country', 'countries')}` },
    }));
  }

  const TYPE_PLURAL = { Conference: 'conferences', Meetup: 'meetups', Festival: 'festivals', Retreat: 'retreats', Unconference: 'unconferences', Hackathon: 'hackathons', Workshop: 'workshops' };
  for (const type of EVENT_TYPES) {
    const evs = events.filter((e) => e.type === type);
    if (!evs.length) continue;
    const nUp = evs.filter((e) => !e.past).length;
    const word = TYPE_PLURAL[type] || `${type.toLowerCase()}s`;
    pages.push(listing({
      kind: 'type',
      path: `type/${slugify(word)}`,
      title: `Bitcoin ${word[0].toUpperCase()}${word.slice(1)} Worldwide: Dates and Cities | ${SITE_NAME}`,
      h1: `Bitcoin ${word}`,
      description: `${plural(nUp, `upcoming Bitcoin ${type.toLowerCase()}`, `upcoming Bitcoin ${word}`)} and ${plural(evs.length - nUp, 'past one')} worldwide, with dates, cities and links to the organizers' official pages.`,
      intro: `${plural(nUp, `upcoming Bitcoin ${type.toLowerCase()}`, `upcoming Bitcoin ${word}`)} worldwide.`,
      evs, mts: [],
      crumbs: [{ name: `Bitcoin ${word}`, path: `type/${slugify(word)}` }],
      og: { kicker: 'Bitcoin events', title: `Bitcoin ${word}`, line: `${nUp} upcoming` },
    }));
  }

  const regions = [...new Set(meetups.map((m) => m.region))];
  pages.push(listing({
    kind: 'meetups',
    path: 'meetups',
    title: `Bitcoin Meetups Worldwide: ${meetups.length} Local Groups | ${SITE_NAME}`,
    h1: 'Bitcoin meetups worldwide',
    description: `${meetups.length} recurring Bitcoin meetups in ${new Set(meetups.map((m) => m.country).filter(Boolean)).size} countries, from monthly Stammtisch to Socratic seminars, each linked to its organizer.`,
    intro: `${meetups.length} recurring Bitcoin meetups, grouped by region. Every link goes to the group's own page.`,
    evs: [], mts: meetups,
    crumbs: [{ name: 'Meetups', path: 'meetups' }],
    og: { kicker: 'Bitcoin meetups', title: 'Local Bitcoin meetups', line: `${meetups.length} groups · ${regions.length} regions` },
  }));
  for (const region of regions) {
    const mts = meetups.filter((m) => m.region === region);
    pages.push({
      ...listing({
        kind: 'meetups-region',
        path: `meetups/${slugify(region)}`,
        title: `Bitcoin Meetups in ${region}: ${mts.length} Local Groups | ${SITE_NAME}`,
        h1: `Bitcoin meetups in ${region}`,
        description: `${plural(mts.length, 'recurring Bitcoin meetup')} in ${region} across ${plural(new Set(mts.map((m) => m.country).filter(Boolean)).size, 'country', 'countries')}, each linked to its organizer.`,
        intro: `${plural(mts.length, 'recurring Bitcoin meetup')} in ${region}.`,
        evs: [], mts,
        crumbs: [{ name: 'Meetups', path: 'meetups' }, { name: region, path: `meetups/${slugify(region)}` }],
        og: { kicker: 'Bitcoin meetups', title: `Meetups in ${region}`, line: `${mts.length} groups` },
      }),
    });
  }

  // Which hub pages exist, for the "Browse" block on the home page.
  const hubs = {
    years: pages.filter((p) => p.kind === 'year'),
    types: pages.filter((p) => p.kind === 'type'),
    countries: pages.filter((p) => p.kind === 'country' && p.indexable),
    regions: pages.filter((p) => p.kind === 'meetups-region'),
  };

  return { events, upcoming, meetups, details, places, pages, hubs, ctx, countryNames, years, regions };
}

// --- JSON-LD ------------------------------------------------------------------------
const absoluteImage = (image, origin) => (!image ? null : /^https?:/i.test(image) ? image : new URL(image.replace(/^\//, ''), origin).href);

export function breadcrumbLd(page, urlOf) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: page.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: urlOf(c.path) })),
  };
}

export function eventLd(page, { urlOf, origin }) {
  const e = page.event;
  const images = [urlOf(`og/${page.path}`).replace(/\/$/, '.png'), absoluteImage(e.detail?.image, origin)].filter(Boolean);
  return {
    '@type': 'Event',
    name: e.title,
    startDate: e.start,
    endDate: e.end,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: e.online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: e.online
      ? { '@type': 'VirtualLocation', url: e.url }
      : { '@type': 'Place', name: e.where, address: { '@type': 'PostalAddress', ...(e.city ? { addressLocality: e.city } : {}), addressCountry: e.country } },
    url: urlOf(e.path),
    sameAs: e.url,
    description: page.description,
    image: images,
  };
}

export function pageLd(page, ctx) {
  const graph = [breadcrumbLd(page, ctx.urlOf)];
  if (page.kind === 'event') graph.unshift(eventLd(page, ctx));
  else graph.unshift({ '@type': 'CollectionPage', name: page.h1, url: ctx.urlOf(page.path), description: page.description, isPartOf: { '@type': 'WebSite', url: ctx.origin, name: SITE_NAME } });
  return { '@context': 'https://schema.org', '@graph': graph };
}

// --- Markdown copies ----------------------------------------------------------------
export function pageMarkdown(page, { urlOf }) {
  const lines = [];
  const eventLine = (e) => `- [${e.title}](${urlOf(e.path)}): ${e.dateLabel} ${e.start.slice(0, 4)}, ${e.where} (${e.type}). Official page: ${e.url}`;
  const meetupLine = (m) => `- [${m.name}](${m.url}): ${m.where}. ${m.schedule}`;
  if (page.kind === 'event') {
    const e = page.event;
    lines.push(`# ${e.title}`, '', `> ${e.type} · ${fullDates(e)} · ${e.where}`, '');
    lines.push(page.lead, '');
    lines.push(
      `- When: ${fullDates(e)}`,
      `- Where: ${e.where}`,
      `- Type: ${e.type}`,
      `- Official page: ${e.url}`,
      `- Calendar file: ${urlOf(`${e.path}/event.ics`).replace(/\/$/, '')}`,
      `- This page: ${urlOf(e.path)}`,
      `- Facts and corrections: ${REPO}/issues/new?template=event-correction.yml`,
      '',
    );
    const r = page.related;
    if (r.editions.length) lines.push('## Other editions', '', ...r.editions.map(eventLine), '');
    if (r.sameCountry.length) lines.push(`## More upcoming events in ${e.country}`, '', ...r.sameCountry.map(eventLine), '');
    if (r.meetups.length) lines.push(`## Meetups in ${e.country}`, '', ...r.meetups.map(meetupLine), '');
  } else {
    lines.push(`# ${page.h1}`, '', `> ${page.intro}`, '', `This page: ${urlOf(page.path)}`, '');
    if (page.events.length) lines.push('## Upcoming events', '', ...page.events.map(eventLine), '');
    if (page.meetups.length) lines.push('## Meetups', '', ...page.meetups.map(meetupLine), '');
    if (page.pastEvents.length) lines.push('## Past events', '', ...page.pastEvents.map(eventLine), '');
  }
  lines.push(`Source list: ${urlOf('index.md').replace(/\/$/, '')}`, '');
  return lines.join('\n');
}

// --- open data and feeds ---------------------------------------------------------------
// events.json: the whole list as plain JSON (CC0), generated from README.md and PAST.md.
export function eventsJson(model) {
  const { urlOf } = model.ctx;
  const file = (path) => urlOf(path).replace(/\/$/, '');
  return JSON.stringify({
    name: SITE_NAME,
    license: 'CC0-1.0',
    source: `${REPO}/blob/main/README.md`,
    generated: model.ctx.buildDay,
    counts: { events: model.events.length, upcoming: model.upcoming.length, meetups: model.meetups.length },
    events: model.events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      location: e.where,
      city: e.city,
      country: e.country,
      online: e.online,
      type: e.type,
      status: e.past ? 'past' : 'upcoming',
      official_url: e.url,
      page_url: urlOf(e.path),
      calendar_url: file(`${e.path}/event.ics`),
      ...(e.detail?.description ? { description: e.detail.description } : {}),
    })),
    meetups: model.meetups.map((m) => ({
      id: m.id,
      name: m.name,
      region: m.region,
      location: m.where,
      city: m.city,
      country: m.country,
      about: m.schedule,
      official_url: m.url,
      other_links: m.links ?? [],
    })),
  }, null, 2) + '\n';
}

const xmlEscape = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// feed.xml: Atom feed of the next 50 upcoming events. The list has no "added on" dates, so an
// entry appears when an event enters the next-50 window and keeps its id afterwards.
export function atomFeed(model, limit = 50) {
  const { urlOf, origin, buildDay } = model.ctx;
  const host = new URL(origin).hostname;
  const entries = model.upcoming.slice(0, limit).map((e) => `  <entry>
    <id>tag:${host},${e.start.slice(0, 4)}:${e.slug}</id>
    <title>${xmlEscape(e.title)}</title>
    <link rel="alternate" href="${urlOf(e.path)}"/>
    <updated>${buildDay}T00:00:00Z</updated>
    <summary>${xmlEscape(`${e.type} · ${e.dateLabel} ${e.start.slice(0, 4)} · ${e.where}`)}</summary>
  </entry>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${origin}</id>
  <title>${SITE_NAME}: upcoming events</title>
  <subtitle>The next ${Math.min(limit, model.upcoming.length)} Bitcoin events on the list</subtitle>
  <link rel="self" href="${urlOf('feed.xml').replace(/\/$/, '')}"/>
  <link rel="alternate" href="${origin}"/>
  <updated>${buildDay}T00:00:00Z</updated>
${entries.join('\n')}
</feed>
`;
}

// --- sitemap ------------------------------------------------------------------------
export function sitemapXml(model) {
  const { urlOf } = model.ctx;
  const urls = [urlOf(''), ...model.pages.filter((p) => p.indexable).map((p) => urlOf(p.path))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
}
