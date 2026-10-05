// Parser for the awesome-list Markdown files (README.md and PAST.md).
//
// README.md is the single source of truth for events. This module reads it and turns
// every list item into a plain event object. The website, the `npm run check`
// validator and the `npm run archive` helper all use this one parser, so the list
// format is defined in exactly one place.
//
// Format (see .github/CONTRIBUTING.md): one table per year.
//
//   ## 2026                                  <- year heading (4 digits)
//
//   | Date | Event | Location | Type |
//   | --- | --- | --- | --- |
//   | Oct 12–15 | [TABConf 8](https://tabconf.com/) | Atlanta, USA | Conference |
//   | Oct 29 – Nov 1 | [LABITCONF 2026](https://www.labitconf.com/) | Buenos Aires, Argentina | Conference |
//
// The month lives in the date cell, so there are no month headings. Only table rows
// under a year heading are read as events; everything else in the file (intro,
// contents, contributing…) is ignored.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = MONTHS.map((month) => month.slice(0, 3));

// The allowed event types. Add a new one here (and in .github/CONTRIBUTING.md) if needed.
export const EVENT_TYPES = [
  'Conference', 'Meetup', 'Festival', 'Retreat', 'Unconference', 'Hackathon', 'Workshop',
];

const YEAR_HEADING_RE = /^## (\d{4})\s*$/;
const OTHER_H2_RE = /^## /;
const MONTH_HEADING_RE = /^### (\S+)\s*$/;
export const TABLE_HEADER = '| Date | Event | Location | Type |';
export const TABLE_DIVIDER = '| --- | --- | --- | --- |';
const HEADER_ROW_RE = /^\|\s*Date\s*\|/i;
const DIVIDER_ROW_RE = /^\|[\s|:-]+\|$/;
// | Dates | [Title](url) | Location | Type |
const ROW_RE = /^\|\s*(?<dates>[^|]+?)\s*\|\s*\[(?<title>[^\]]+)\]\((?<url>[^\s)]+)\)\s*\|\s*(?<where>[^|]+?)\s*\|\s*(?<type>[^|]+?)\s*\|$/;
// "Oct 12", "Oct 12–15", "Oct 29 – Nov 1" (en dash or hyphen)
const DATES_RE = /^(?<m1>[A-Z][a-z]{2}) (?<d1>\d{1,2})(?:\s*[–-]\s*(?:(?<m2>[A-Z][a-z]{2}) )?(?<d2>\d{1,2}))?$/;

function iso(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function slugify(value) {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/₿/g, 'b').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Parses "Oct 29 – Nov 1" within a year into ISO start/end. An end month earlier than
// the start month means the event crosses into the next year (e.g. "Dec 30 – Jan 2").
export function parseDates(text, year) {
  const match = text.trim().match(DATES_RE);
  if (!match) return { error: `dates "${text.trim()}" should look like "Oct 12", "Oct 12–15" or "Oct 29 – Nov 1"` };
  const { m1, d1, m2, d2 } = match.groups;
  const startMonth = MONTH_ABBR.indexOf(m1);
  const endMonth = m2 ? MONTH_ABBR.indexOf(m2) : startMonth;
  if (startMonth < 0 || endMonth < 0) return { error: `unknown month in "${text.trim()}" (use Jan, Feb, Mar…)` };
  const endYear = endMonth < startMonth ? year + 1 : year;
  const start = iso(year, startMonth, Number(d1));
  const end = iso(endYear, endMonth, Number(d2 ?? d1));
  if (!start || !end) return { error: `"${text.trim()}" is not a real calendar date in ${year}` };
  if (end < start) return { error: `end date is before start date in "${text.trim()}"` };
  return { start, end, startMonth };
}

function httpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Splits "City, Country" into parts. "Online" and a bare country are allowed too.
export function splitLocation(where) {
  if (where === 'Online') return { city: null, country: null, online: true };
  const parts = where.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) return { city: null, country: parts[0], online: false };
  return { city: parts.slice(0, -1).join(', '), country: parts.at(-1), online: false };
}

/**
 * Parses one awesome-list Markdown file.
 * @param {string} text  file contents
 * @param {string} file  file name, used in error messages and on each event
 * @returns {{ events: object[], errors: string[] }}  errors are "file:line: message"
 */
export function parseList(text, file = 'README.md') {
  const events = [];
  const errors = [];
  let year = null;
  text.split(/\r?\n/).forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trimEnd();
    const fail = (message) => errors.push(`${file}:${lineNo}: ${message}`);

    const yearMatch = line.match(YEAR_HEADING_RE);
    if (yearMatch) { year = Number(yearMatch[1]); return; }
    if (OTHER_H2_RE.test(line)) { year = null; return; }
    if (year === null) return; // outside the event sections

    const monthMatch = line.match(MONTH_HEADING_RE);
    if (monthMatch) return fail(`month headings are gone - one table per year, so delete the "### ${monthMatch[1]}" line`);
    if (line.startsWith('- ')) return fail('events are table rows now: | Oct 12–15 | [Name](https://…) | City, Country | Type |');
    if (!line.startsWith('|') || HEADER_ROW_RE.test(line) || DIVIDER_ROW_RE.test(line)) return;

    const row = line.match(ROW_RE);
    if (!row) return fail('row should be: | Oct 12–15 | [Event name](https://official-url) | City, Country | Type |');
    const { dates, title, url, where, type } = row.groups;
    if (!httpUrl(url)) return fail(`"${url}" is not an http(s) link`);
    const parsed = parseDates(dates, year);
    if (parsed.error) return fail(parsed.error);
    if (!EVENT_TYPES.includes(type)) return fail(`type "${type}" should be one of: ${EVENT_TYPES.join(', ')}`);

    events.push({
      id: `${slugify(title)}-${parsed.start}`,
      title,
      url,
      start: parsed.start,
      end: parsed.end,
      dateLabel: dates.trim(),
      where: where.trim(),
      ...splitLocation(where.trim()),
      type,
      file,
      line: lineNo,
    });
  });
  return { events, errors };
}

// Extra list-wide checks: duplicates and date order within each year.
export function checkEvents(events) {
  const errors = [];
  const seen = new Map();
  for (const event of events) {
    const key = `${event.url}|${event.start}`;
    if (seen.has(key)) errors.push(`${event.file}:${event.line}: duplicate of ${seen.get(key)}`);
    else seen.set(key, `${event.file}:${event.line}`);
  }
  for (let i = 1; i < events.length; i += 1) {
    const previous = events[i - 1];
    const current = events[i];
    const sameYear = previous.file === current.file && previous.start.slice(0, 4) === current.start.slice(0, 4);
    if (sameYear && current.start < previous.start) {
      errors.push(`${current.file}:${current.line}: "${current.title}" should come before "${previous.title}" (sort by start date)`);
    }
  }
  return errors;
}

// Renders events as one table per year. Used by scripts/archive-past.mjs to rewrite
// the event part of README.md / PAST.md.
export function renderSections(events, { newestYearFirst = false } = {}) {
  const byYear = new Map();
  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.title.localeCompare(b.title))) {
    const year = event.start.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(event);
  }
  const years = [...byYear.keys()].sort();
  if (newestYearFirst) years.reverse();
  const lines = [];
  for (const year of years) {
    lines.push(`## ${year}`, '', TABLE_HEADER, TABLE_DIVIDER);
    for (const e of byYear.get(year)) lines.push(`| ${e.dateLabel} | [${e.title}](${e.url}) | ${e.where} | ${e.type} |`);
    lines.push('');
  }
  return lines;
}

// --- Meetups (the "Meetups" section of README.md) -----------------------------------
// Recurring meetups, one table per region, as a subsection of the list itself:
//
//   ## Meetups
//
//   ### Europe
//
//   | Where | Meetup | About |
//   | --- | --- | --- |
//   | Prague, Czech Republic | [Bitcoin Prague](https://…) | Monthly |
//
// A "## Region" heading still works, so older files keep parsing.

export const MEETUP_REGIONS = [
  'Europe', 'North America', 'Latin America', 'Asia', 'Oceania', 'Africa', 'Middle East', 'Online',
];
// A meetup that lives on more than one official page keeps the extra pages in its About cell:
// "Monthly Stammtisch · [Einundzwanzig portal](https://…)". The first link stays the main one.
const MEETUP_EXTRA_LINK_RE = /\s*[·•]?\s*\[([^\]]+)\]\(([^\s)]+)\)/g;
const MEETUP_ROW_RE = /^\|\s*(?<where>[^|]+?)\s*\|\s*\[(?<name>[^\]]+)\]\((?<url>[^\s)]+)\)\s*\|\s*(?<schedule>[^|]+?)\s*\|$/;

export function parseMeetups(text, file = 'README.md') {
  const meetups = [];
  const errors = [];
  let region = null;
  let inMeetups = false; // inside the "## Meetups" section of the list
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trimEnd();
    const fail = (message) => errors.push(`${file}:${index + 1}: ${message}`);
    const h2 = line.match(/^## (.+?)\s*$/);
    if (h2) {
      region = MEETUP_REGIONS.includes(h2[1]) ? h2[1] : null;
      inMeetups = Boolean(region) || h2[1] === 'Meetups';
      return;
    }
    const h3 = line.match(/^### (.+?)\s*$/);
    if (h3) {
      if (MEETUP_REGIONS.includes(h3[1])) {
        region = h3[1];
        inMeetups = true;
        return;
      }
      if (inMeetups) fail(`"${h3[1]}" is not a region (use one of: ${MEETUP_REGIONS.join(', ')})`);
      region = null;
      return;
    }
    if (region === null || !line.startsWith('|') || /^\|\s*Where\s*\|/i.test(line) || DIVIDER_ROW_RE.test(line)) return;
    const row = line.match(MEETUP_ROW_RE);
    if (!row) return fail('row should be: | City, Country | [Meetup name](https://…) | Monthly |');
    const { where, name, url } = row.groups;
    const links = [...row.groups.schedule.matchAll(MEETUP_EXTRA_LINK_RE)].map((m) => ({ label: m[1], url: m[2] }));
    const schedule = row.groups.schedule.replace(MEETUP_EXTRA_LINK_RE, '').replace(/\s*[·•]\s*$/, '').trim();
    if (!httpUrl(url)) return fail(`"${url}" is not an http(s) link`);
    if (!schedule) return fail('About cell needs a short description before any extra links');
    const badLink = links.find((l) => !httpUrl(l.url));
    if (badLink) return fail(`"${badLink.url}" is not an http(s) link`);
    meetups.push({ id: `meetup-${slugify(name)}-${slugify(where)}`, name, url, links, where, schedule, region, ...splitLocation(where), file, line: index + 1 });
  });
  return { meetups, errors };
}
