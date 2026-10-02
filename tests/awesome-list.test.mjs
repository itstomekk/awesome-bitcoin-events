// Tests for the list parser (`npm test`). Uses Node's built-in test runner; no extra deps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseList, parseDates, checkEvents, splitLocation, renderSections, parseMeetups } from '../src/lib/awesome-list.js';
import { loadMeetups } from '../src/lib/load-list.js';
import { loadEvents } from '../src/lib/load-list.js';

// One table per year, no month headings (the current format).
const list = (rows, year = 2026) => `# Title\n\n## ${year}\n\n| Date | Event | Location | Type |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n## Contributing\n\n| Not | an | event | table |\n`;
// The old shape, kept only to prove month headings are now rejected.
const listWithMonth = (rows, month = 'October', year = 2026) => `# Title\n\n## ${year}\n\n### ${month}\n\n| Date | Event | Location | Type |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`;

test('parses a single-day, multi-day and cross-month event', () => {
  const { events, errors } = parseList(list([
    '| Oct 24 | [One Day](https://a.example) | Wellington, New Zealand | Meetup |',
    '| Oct 12–15 | [Multi](https://b.example/) | Atlanta, USA | Conference |',
    '| Oct 29 – Nov 1 | [Cross](https://c.example) | Buenos Aires, Argentina | Conference |',
  ]));
  assert.deepEqual(errors, []);
  assert.equal(events.length, 3);
  assert.deepEqual([events[0].start, events[0].end], ['2026-10-24', '2026-10-24']);
  assert.deepEqual([events[1].start, events[1].end], ['2026-10-12', '2026-10-15']);
  assert.deepEqual([events[2].start, events[2].end], ['2026-10-29', '2026-11-01']);
  assert.equal(events[1].city, 'Atlanta');
  assert.equal(events[1].country, 'USA');
});

test('reads every month of the year from one table, with no month headings', () => {
  const { events, errors } = parseList(list([
    '| Jan 5 | [A](https://a.example) | Berlin, Germany | Conference |',
    '| Jun 2 | [B](https://b.example) | Berlin, Germany | Conference |',
    '| Dec 1 | [C](https://c.example) | Berlin, Germany | Conference |',
  ]));
  assert.deepEqual(errors, []);
  assert.deepEqual(events.map((e) => e.start), ['2026-01-05', '2026-06-02', '2026-12-01']);
});

test('ignores tables outside year sections', () => {
  const { events } = parseList(list(['| Oct 1 | [A](https://a.example) | Berlin, Germany | Conference |']));
  assert.equal(events.length, 1);
});

test('an event crossing New Year ends in the next year', () => {
  assert.deepEqual(parseDates('Dec 30 – Jan 2', 2026).end, '2027-01-02');
});

test('reports helpful errors with line numbers', () => {
  const cases = [
    ['| Oct 1 | Missing link | Berlin, Germany | Conference |', /row should be/],
    ['| Oct 1 | [A](https://a.example) | Berlin, Germany |', /row should be/],
    ['| Oct 1 | [A](ftp://a.example) | Berlin, Germany | Conference |', /not an http/],
    ['| Oct 31–32 | [A](https://a.example) | Berlin, Germany | Conference |', /not a real calendar date/],
    ['| Oct 1 | [A](https://a.example) | Berlin, Germany | Party |', /should be one of/],
    ['| Oct 5–2 | [A](https://a.example) | Berlin, Germany | Conference |', /before start/],
    ['- [A](https://a.example) - Oct 1 · Berlin, Germany · Conference.', /table rows now/],
  ];
  for (const [line, pattern] of cases) {
    const { errors } = parseList(list([line]));
    assert.equal(errors.length, 1, line);
    assert.match(errors[0], /^README\.md:7: /);
    assert.match(errors[0], pattern);
  }
});

test('rejects month headings with a migration hint', () => {
  const { errors } = parseList(listWithMonth(['| Oct 1 | [A](https://a.example) | Berlin, Germany | Conference |']));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /month headings are gone/);
  assert.match(errors[0], /### October/);
});

test('flags duplicates and wrong order within a year', () => {
  const { events } = parseList(list([
    '| Oct 9 | [B](https://b.example) | Berlin, Germany | Conference |',
    '| Oct 2 | [A](https://a.example) | Berlin, Germany | Conference |',
    '| Oct 2 | [A again](https://a.example) | Berlin, Germany | Conference |',
  ]));
  const errors = checkEvents(events);
  assert.ok(errors.some((e) => /should come before/.test(e)));
  assert.ok(errors.some((e) => /duplicate/.test(e)));
});

test('flags wrong order across different months of the same year', () => {
  const { events } = parseList(list([
    '| Dec 1 | [Late](https://b.example) | Berlin, Germany | Conference |',
    '| Jan 5 | [Early](https://a.example) | Berlin, Germany | Conference |',
  ]));
  assert.ok(checkEvents(events).some((e) => /should come before/.test(e)));
});

test('does not compare dates across a year boundary', () => {
  const twoYears = '# T\n\n## 2026\n\n| Date | Event | Location | Type |\n| --- | --- | --- | --- |\n| Dec 1 | [A](https://a.example) | Berlin, Germany | Conference |\n\n## 2025\n\n| Date | Event | Location | Type |\n| --- | --- | --- | --- |\n| Dec 20 | [B](https://b.example) | Berlin, Germany | Conference |\n';
  const { events } = parseList(twoYears);
  assert.deepEqual(checkEvents(events), []);
});

test('location parsing', () => {
  assert.deepEqual(splitLocation('Online'), { city: null, country: null, online: true });
  assert.deepEqual(splitLocation('Hong Kong'), { city: null, country: 'Hong Kong', online: false });
});

test('renderSections output parses back to the same events', () => {
  const { events } = parseList(list([
    '| Oct 2 | [A](https://a.example) | Berlin, Germany | Conference |',
    '| Oct 29 – Nov 1 | [B](https://b.example) | Online | Workshop |',
  ]));
  const again = parseList(renderSections(events).join('\n')).events;
  assert.deepEqual(again.map((e) => [e.title, e.start, e.end, e.where, e.type]), events.map((e) => [e.title, e.start, e.end, e.where, e.type]));
});

test('renderSections emits one table per year and no month headings', () => {
  const twoYears = '# T\n\n## 2026\n\n| Date | Event | Location | Type |\n| --- | --- | --- | --- |\n| Oct 2 | [A](https://a.example) | Berlin, Germany | Conference |\n\n## 2025\n\n| Date | Event | Location | Type |\n| --- | --- | --- | --- |\n| May 2 | [B](https://b.example) | Berlin, Germany | Conference |\n';
  const { events } = parseList(twoYears);
  const lines = renderSections(events);
  assert.equal(lines.filter((line) => line === '| Date | Event | Location | Type |').length, 2);
  assert.equal(lines.some((line) => line.startsWith('### ')), false);
  assert.deepEqual(lines.filter((line) => /^## /.test(line)), ['## 2025', '## 2026']);
  assert.deepEqual(renderSections(events, { newestYearFirst: true }).filter((line) => /^## /.test(line)), ['## 2026', '## 2025']);
});

test('the real README.md and PAST.md are valid', () => {
  const { events, errors } = loadEvents();
  assert.deepEqual(errors, []);
  assert.ok(events.length > 0);
});

test('parses meetups by region and reports bad rows', () => {
  const text = '# Meetups\n\n## Europe\n\n| Where | Meetup | About |\n| --- | --- | --- |\n| Prague, Czech Republic | [Bitcoin Prague](https://example.org) | Monthly meetup |\n| Oops | no link | x |\n\n## Moon\n';
  const { meetups, errors } = parseMeetups(text);
  assert.equal(meetups.length, 1);
  assert.deepEqual([meetups[0].region, meetups[0].city, meetups[0].country], ['Europe', 'Prague', 'Czech Republic']);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /MEETUPS\.md:8: row should be/);
  assert.match(errors[1], /not a region/);
});

test('the real MEETUPS.md is valid', () => {
  const { meetups, errors } = loadMeetups();
  assert.deepEqual(errors, []);
  assert.ok(meetups.length > 0);
});
