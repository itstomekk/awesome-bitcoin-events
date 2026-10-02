#!/usr/bin/env node
// Turns one "Submit an event" issue into a README.md row in our format.
//
//   npm run event-from-issue -- <issue-number> [--dry-run]
//
// Reads the issue with `gh`, maps the form fields onto
//   | Date | Event | Location | Type |
// and inserts the row into the right year table at its date-ordered position.
// It reuses src/lib/awesome-list.js for parsing and date handling, so the format
// has exactly one definition. The pure helpers below are exported for tests.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EVENT_TYPES, MONTHS, parseList } from '../src/lib/awesome-list.js';

const REPO = 'itstomekk/awesome-bitcoin-events';
const EN_DASH = '\u2013';

// GitHub issue forms render as "### Label" followed by the answer.
export function parseIssueForm(body) {
  const fields = {};
  let label = null;
  let buffer = [];
  const flush = () => {
    if (!label) return;
    const value = buffer.join('\n').trim();
    if (value && !/^_No response_$/i.test(value)) fields[label] = value;
  };
  for (const line of (body || '').split(/\r?\n/)) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      flush();
      label = heading[1];
      buffer = [];
      continue;
    }
    if (label) buffer.push(line);
  }
  flush();
  return fields;
}

// Accepts 2027-05-14, 2027-5-4 or a full ISO timestamp; returns YYYY-MM-DD.
export function isoDate(value) {
  const match = String(value || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function dateLabel(startIso, endIso) {
  const [y1, m1, d1] = startIso.split('-').map(Number);
  const [y2, m2, d2] = endIso.split('-').map(Number);
  const short = (month) => MONTHS[month - 1].slice(0, 3);
  if (startIso === endIso) return `${short(m1)} ${d1}`;
  if (y1 === y2 && m1 === m2) return `${short(m1)} ${d1}${EN_DASH}${d2}`;
  return `${short(m1)} ${d1} ${EN_DASH} ${short(m2)} ${d2}`;
}

// Builds the README row from the parsed form. Returns { row, year, startIso, url } or { error }.
export function buildRow(fields) {
  const title = fields['Event name'];
  const url = fields['Official event URL'];
  if (!title) return { error: 'the issue has no "Event name" (is it the event form?)' };
  if (!url || !/^https?:\/\//i.test(url)) return { error: `"Official event URL" is missing or not http(s): ${url}` };

  const startIso = isoDate(fields['Start date']);
  if (!startIso) return { error: `could not read "Start date" as a date: ${fields['Start date']}` };
  const endIso = fields['End date'] ? isoDate(fields['End date']) : startIso;
  if (!endIso) return { error: `could not read "End date" as a date: ${fields['End date']}` };
  if (endIso < startIso) return { error: `end date ${endIso} is before start date ${startIso}` };

  const attendance = (fields['Attendance mode'] || '').toLowerCase();
  const online = attendance === 'online' || (fields['City'] || '').toLowerCase() === 'online';
  const where = online ? 'Online' : [fields['City'], fields['Country']].filter(Boolean).join(', ');
  if (!where) return { error: 'no city/country and no "Online" attendance mode' };

  const type = fields['Event type'];
  if (!EVENT_TYPES.includes(type)) {
    return { error: `event type "${type}" must be one of: ${EVENT_TYPES.join(', ')}` };
  }

  return {
    row: `| ${dateLabel(startIso, endIso)} | [${title}](${url}) | ${where} | ${type} |`,
    year: startIso.slice(0, 4),
    startIso,
    url,
  };
}

// Where does the row belong? Returns { index, before, year } or { error }.
export function insertionPoint(readmeText, startIso, url) {
  const { events, errors } = parseList(readmeText, 'README.md');
  if (errors.length) return { error: `README.md does not parse cleanly:\n  ${errors.join('\n  ')}` };

  const clash = events.find((event) => event.url === url && event.start === startIso);
  if (clash) return { error: `already listed at README.md:${clash.line}: ${clash.title} (${clash.start})` };

  const year = startIso.slice(0, 4);
  const inYear = events.filter((event) => event.start.startsWith(year)).sort((a, b) => a.line - b.line);
  if (!inYear.length) {
    return {
      error: `no events for ${year} in README.md. Add the section first:\n\n  ## ${year}\n\n  | Date | Event | Location | Type |\n  | --- | --- | --- | --- |`,
    };
  }
  const next = inYear.find((event) => event.start > startIso);
  return {
    index: next ? next.line - 1 : inYear[inYear.length - 1].line,
    before: next ? `${next.title} (${next.start})` : null,
    year,
  };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const issueNumber = args.find((arg) => /^\d+$/.test(arg));
  if (!issueNumber) {
    console.error('usage: npm run event-from-issue -- <issue-number> [--dry-run]');
    process.exit(1);
  }

  const issue = JSON.parse(execFileSync(
    'gh',
    ['issue', 'view', issueNumber, '--repo', REPO, '--json', 'title,body,url'],
    { encoding: 'utf8' },
  ));
  const built = buildRow(parseIssueForm(issue.body));
  if (built.error) {
    console.error(`Issue #${issueNumber}: ${built.error}`);
    process.exit(1);
  }

  const readmePath = path.join(process.cwd(), 'README.md');
  const text = readFileSync(readmePath, 'utf8');
  const spot = insertionPoint(text, built.startIso, built.url);
  if (spot.error) {
    console.error(`Issue #${issueNumber}: ${spot.error}`);
    process.exit(1);
  }

  console.log(`Issue #${issueNumber}: ${issue.title}`);
  console.log(`  ${issue.url}`);
  console.log(`\nrow:  ${built.row}`);
  console.log(`goes into ## ${spot.year}, ${spot.before ? `before "${spot.before}"` : 'at the end of the year table'}`);

  if (dryRun) {
    console.log('\n--dry-run: README.md not touched.');
    return;
  }

  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(nl);
  lines.splice(spot.index, 0, built.row);
  writeFileSync(readmePath, lines.join(nl));
  console.log(`\nREADME.md updated at line ${spot.index + 1}.`);
  console.log('Next: review the diff, then run `npm run check && npm test`.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
