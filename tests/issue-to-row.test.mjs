// Tests for the issue-to-row helpers: the event submission form must convert into
// exactly the row format that src/lib/awesome-list.js accepts.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildRow, dateLabel, insertionPoint, isoDate, parseIssueForm } from '../scripts/issue-to-row.mjs';

const BODY = `### Event name

Bitcoin Example Summit 2027

### Official event URL

https://example.com/events/summit

### Registration or ticket URL

_No response_

### Start date

2027-05-14

### End date

2027-05-16

### Timezone

Europe/Prague

### City

Prague

### Country

Czech Republic

### Event type

Conference

### Attendance mode

In person

### Why should this be added?

The organizer page confirms the dates.
`;

test('parses issue form fields and drops "no response" answers', () => {
  const fields = parseIssueForm(BODY);
  assert.equal(fields['Event name'], 'Bitcoin Example Summit 2027');
  assert.equal(fields['Official event URL'], 'https://example.com/events/summit');
  assert.equal(fields['Start date'], '2027-05-14');
  assert.equal(fields['Registration or ticket URL'], undefined);
  assert.match(fields['Why should this be added?'], /confirms the dates/);
});

test('accepts loose date formats and pads them', () => {
  assert.equal(isoDate('2027-5-4'), '2027-05-04');
  assert.equal(isoDate('2027-05-14T09:00:00Z'), '2027-05-14');
  assert.equal(isoDate('next May'), null);
});

test('formats date labels the way the list does', () => {
  assert.equal(dateLabel('2027-05-14', '2027-05-16'), 'May 14\u201316');
  assert.equal(dateLabel('2027-05-14', '2027-05-14'), 'May 14');
  assert.equal(dateLabel('2027-10-29', '2027-11-08'), 'Oct 29 \u2013 Nov 8');
});

test('builds a row the parser accepts', () => {
  const built = buildRow(parseIssueForm(BODY));
  assert.equal(built.error, undefined);
  assert.equal(built.year, '2027');
  assert.equal(built.row, '| May 14\u201316 | [Bitcoin Example Summit 2027](https://example.com/events/summit) | Prague, Czech Republic | Conference |');
});

test('an online event becomes "Online"', () => {
  const fields = { ...parseIssueForm(BODY), 'Attendance mode': 'Online' };
  const built = buildRow(fields);
  assert.match(built.row, /\| Online \| Conference \|$/);
});

test('rejects a type outside the allowed list and a bad URL', () => {
  const fields = parseIssueForm(BODY);
  assert.match(buildRow({ ...fields, 'Event type': 'Other' }).error, /must be one of/);
  assert.match(buildRow({ ...fields, 'Official event URL': 'example.com' }).error, /not http\(s\)/);
});

test('finds the insertion point inside the right year, in date order', () => {
  const readme = [
    '# Awesome Bitcoin Events',
    '',
    '## 2027',
    '',
    '| Date | Event | Location | Type |',
    '| --- | --- | --- | --- |',
    '| Jan 10 | [Earlier](https://example.com/a) | Prague, Czech Republic | Conference |',
    '| Jul 1 | [Later](https://example.com/b) | Prague, Czech Republic | Conference |',
    '',
  ].join('\n');
  const spot = insertionPoint(readme, '2027-05-14', 'https://example.com/new');
  assert.equal(spot.error, undefined);
  assert.equal(spot.year, '2027');
  assert.equal(spot.before, 'Later (2027-07-01)');
  assert.equal(spot.index, 7); // 0-based: the "Later" row sits on line 8
});

test('refuses a duplicate and a missing year section', () => {
  const readme = [
    '## 2027',
    '',
    '| Date | Event | Location | Type |',
    '| --- | --- | --- | --- |',
    '| May 14\u201316 | [Dup](https://example.com/dup) | Prague, Czech Republic | Conference |',
    '',
  ].join('\n');
  assert.match(insertionPoint(readme, '2027-05-14', 'https://example.com/dup').error, /already listed/);
  assert.match(insertionPoint(readme, '2030-01-01', 'https://example.com/new').error, /no events for 2030/);
});

test('the real README parses and its year tables are usable', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const spot = insertionPoint(readme, '2026-12-31', 'https://example.com/never-listed');
  assert.equal(spot.error, undefined);
  assert.equal(spot.year, '2026');
});
