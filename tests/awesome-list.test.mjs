// Tests for the list parser (`npm test`). Uses Node's built-in test runner; no extra deps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseList, parseDates, checkEvents, splitLocation } from '../src/lib/awesome-list.js';
import { loadEvents } from '../src/lib/load-list.js';

const list = (items, month = 'October', year = 2026) => `# Title\n\n## ${year}\n\n### ${month}\n\n${items.join('\n')}\n\n## Contributing\n\n- [Not an event](https://example.com) - Ignored.\n`;

test('parses a single-day, multi-day and cross-month event', () => {
  const { events, errors } = parseList(list([
    '- [One Day](https://a.example) - Oct 24 · Wellington, New Zealand · Meetup.',
    '- [Multi](https://b.example/) - Oct 12–15 · Atlanta, USA · Conference. Dev-focused.',
    '- [Cross](https://c.example) - Oct 29 – Nov 1 · Buenos Aires, Argentina · Conference.',
  ]));
  assert.deepEqual(errors, []);
  assert.equal(events.length, 3);
  assert.deepEqual([events[0].start, events[0].end], ['2026-10-24', '2026-10-24']);
  assert.deepEqual([events[1].start, events[1].end, events[1].note], ['2026-10-12', '2026-10-15', 'Dev-focused.']);
  assert.deepEqual([events[2].start, events[2].end], ['2026-10-29', '2026-11-01']);
  assert.equal(events[1].city, 'Atlanta');
  assert.equal(events[1].country, 'USA');
});

test('ignores list items outside year sections', () => {
  const { events } = parseList(list(['- [A](https://a.example) - Oct 1 · Berlin, Germany · Conference.']));
  assert.equal(events.length, 1);
});

test('an event crossing New Year ends in the next year', () => {
  assert.deepEqual(parseDates('Dec 30 – Jan 2', 2026).end, '2027-01-02');
});

test('reports helpful errors with line numbers', () => {
  const cases = [
    ['- Missing link - Oct 1 · Berlin, Germany · Conference.', /should start with/],
    ['- [A](ftp://a.example) - Oct 1 · Berlin, Germany · Conference.', /not an http/],
    ['- [A](https://a.example) - Oct 1, Berlin, Germany, Conference', /separated by " · "/],
    ['- [A](https://a.example) - Oct 31–32 · Berlin, Germany · Conference.', /not a real calendar date/],
    ['- [A](https://a.example) - Nov 1 · Berlin, Germany · Conference.', /listed under October/],
    ['- [A](https://a.example) - Oct 1 · Berlin, Germany · Party.', /should be one of/],
    ['- [A](https://a.example) - Oct 5–2 · Berlin, Germany · Conference.', /before start/],
  ];
  for (const [line, pattern] of cases) {
    const { errors } = parseList(list([line]));
    assert.equal(errors.length, 1, line);
    assert.match(errors[0], /^README\.md:7: /);
    assert.match(errors[0], pattern);
  }
});

test('rejects bad month headings', () => {
  const { errors } = parseList(list(['- [A](https://a.example) - Oct 1 · Berlin, Germany · Conference.'], 'Octobre'));
  assert.match(errors[0], /not a month name/);
});

test('flags duplicates and wrong order within a month', () => {
  const { events } = parseList(list([
    '- [B](https://b.example) - Oct 9 · Berlin, Germany · Conference.',
    '- [A](https://a.example) - Oct 2 · Berlin, Germany · Conference.',
    '- [A again](https://a.example) - Oct 2 · Berlin, Germany · Conference.',
  ]));
  const errors = checkEvents(events);
  assert.ok(errors.some((e) => /should come before/.test(e)));
  assert.ok(errors.some((e) => /duplicate/.test(e)));
});

test('location parsing', () => {
  assert.deepEqual(splitLocation('Online'), { city: null, country: null, online: true });
  assert.deepEqual(splitLocation('Hong Kong'), { city: null, country: 'Hong Kong', online: false });
});

test('the real README.md and PAST.md are valid', () => {
  const { events, errors } = loadEvents();
  assert.deepEqual(errors, []);
  assert.ok(events.length > 0);
});
