// Parser for the awesome-list Markdown files (README.md and PAST.md).
//
// README.md is the single source of truth for events. This module reads it and turns
// every list item into a plain event object. The website, the `npm run check`
// validator and the `npm run archive` helper all use this one parser, so the list
// format is defined in exactly one place.
//
// Format (see CONTRIBUTING.md):
//
//   ## 2026                       <- year heading (4 digits)
//   ### October                   <- month heading (full English month name)
//   - [TABConf 8](https://tabconf.com/) - Oct 12–15 · Atlanta, USA · Conference.
//   - [Name](https://…) - Oct 29 – Nov 1 · Buenos Aires, Argentina · Conference. Optional note.
//
// Only items under a year heading are read as events; everything else in the file
// (intro, contents, contributing…) is ignored.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = MONTHS.map((month) => month.slice(0, 3));

// The allowed event types. Add a new one here (and in CONTRIBUTING.md) if needed.
export const EVENT_TYPES = [
  'Conference', 'Meetup', 'Festival', 'Retreat', 'Unconference', 'Hackathon', 'Workshop',
];

const YEAR_HEADING_RE = /^## (\d{4})\s*$/;
const OTHER_H2_RE = /^## /;
const MONTH_HEADING_RE = /^### (\S+)\s*$/;
// - [Title](url) - rest
const ITEM_RE = /^- \[(?<title>[^\]]+)\]\((?<url>[^\s)]+)\) - (?<rest>.+)$/;
// Dates · Location · Type. Optional note
const REST_RE = /^(?<dates>[^·]+?) · (?<where>[^·]+?) · (?<type>[A-Za-z-]+)\.(?: (?<note>.+))?$/;
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
  let month = null;
  text.split(/\r?\n/).forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trimEnd();
    const fail = (message) => errors.push(`${file}:${lineNo}: ${message}`);

    const yearMatch = line.match(YEAR_HEADING_RE);
    if (yearMatch) { year = Number(yearMatch[1]); month = null; return; }
    if (OTHER_H2_RE.test(line)) { year = null; month = null; return; }
    if (year === null) return; // outside the event sections

    const monthMatch = line.match(MONTH_HEADING_RE);
    if (monthMatch) {
      month = MONTHS.indexOf(monthMatch[1]);
      if (month < 0) fail(`"${monthMatch[1]}" is not a month name (use e.g. "### October")`);
      return;
    }
    if (!line.startsWith('- ')) return;

    const item = line.match(ITEM_RE);
    if (!item) return fail('list item should start with "- [Event name](https://official-url) - "');
    const { title, url, rest } = item.groups;
    if (!httpUrl(url)) return fail(`"${url}" is not an http(s) link`);
    const parts = rest.match(REST_RE);
    if (!parts) return fail('after the link, write "Oct 12–15 · City, Country · Type." (separated by " · ", ending with a period)');
    const { dates, where, type, note } = parts.groups;
    if (month === null) return fail('event is not under a month heading (e.g. "### October")');
    const parsed = parseDates(dates, year);
    if (parsed.error) return fail(parsed.error);
    if (parsed.startMonth !== month) return fail(`starts in ${MONTHS[parsed.startMonth]} but is listed under ${MONTHS[month]}`);
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
      note: note ? note.trim() : null,
      file,
      line: lineNo,
    });
  });
  return { events, errors };
}

// Extra list-wide checks: duplicates and date order within each month.
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
    const sameMonth = previous.file === current.file && previous.start.slice(0, 7) === current.start.slice(0, 7);
    if (sameMonth && current.start < previous.start) {
      errors.push(`${current.file}:${current.line}: "${current.title}" should come before "${previous.title}" (sort by start date)`);
    }
  }
  return errors;
}
