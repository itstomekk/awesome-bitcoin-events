#!/usr/bin/env node
// Moves events that have ended from README.md to PAST.md (`npm run archive`).
//
// This only edits the two Markdown files: it removes each ended event's line from
// README.md (plus any month/year heading left empty) and inserts the line into PAST.md
// under the right year and month, keeping date order. Review the diff before committing.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseList, MONTHS } from '../src/lib/awesome-list.js';

const today = process.argv.includes('--today') ? process.argv[process.argv.indexOf('--today') + 1] : new Date().toISOString().slice(0, 10);
const readme = readFileSync('README.md', 'utf8').split('\n');
const past = readFileSync('PAST.md', 'utf8').split('\n');

const ended = parseList(readme.join('\n'), 'README.md').events.filter((event) => event.end < today);
if (!ended.length) {
  console.log('Nothing to archive.');
  process.exit(0);
}

// 1. Remove ended lines from README.md, then drop headings that no longer have events.
const endedLines = new Set(ended.map((event) => event.line - 1));
let kept = readme.filter((_, index) => !endedLines.has(index));
const isHeading = (line) => /^#{2,3} /.test(line);
const hasEventsUntilNextHeading = (lines, from, level) => {
  for (let i = from + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('- [')) return true;
    if (isHeading(lines[i]) && lines[i].indexOf(' ') <= level) return false;
  }
  return false;
};
kept = kept.filter((line, index) => {
  if (/^### /.test(line)) return hasEventsUntilNextHeading(kept, index, 3);
  if (/^## \d{4}\s*$/.test(line)) return hasEventsUntilNextHeading(kept, index, 2);
  return true;
});
const removedYears = [...new Set(ended.map((event) => event.start.slice(0, 4)))]
  .filter((year) => !kept.includes(`## ${year}`));
kept = kept.filter((line) => !removedYears.some((year) => line === `- [${year}](#${year})`));
writeFileSync('README.md', kept.join('\n').replace(/\n{3,}/g, '\n\n'));

// Start date of a single list line, parsed in the context of its year/month heading.
const startOf = (line, year, monthHeading) => parseList(`## ${year}\n${monthHeading}\n${line}`).events[0]?.start ?? '';

// 2. Insert each ended line into PAST.md (years newest first, months and days in order).
for (const event of ended) {
  const year = event.start.slice(0, 4);
  const monthHeading = `### ${MONTHS[Number(event.start.slice(5, 7)) - 1]}`;
  const text = readme[event.line - 1];
  let yearIndex = past.indexOf(`## ${year}`);
  if (yearIndex === -1) {
    // New year section: place it before the first older year (or at the end).
    const olderIndex = past.findIndex((line) => /^## \d{4}\s*$/.test(line) && line.slice(3) < year);
    const insertAt = olderIndex === -1 ? past.length : olderIndex;
    past.splice(insertAt, 0, `## ${year}`, '', monthHeading, '', text, '');
    continue;
  }
  let sectionEnd = past.findIndex((line, i) => i > yearIndex && /^## /.test(line));
  if (sectionEnd === -1) sectionEnd = past.length;
  let monthIndex = past.findIndex((line, i) => i > yearIndex && i < sectionEnd && line === monthHeading);
  if (monthIndex === -1) {
    const laterMonth = past.findIndex((line, i) => i > yearIndex && i < sectionEnd && /^### /.test(line)
      && MONTHS.indexOf(line.slice(4)) > MONTHS.indexOf(monthHeading.slice(4)));
    const insertAt = laterMonth === -1 ? sectionEnd : laterMonth;
    past.splice(insertAt, 0, monthHeading, '', text, '');
    continue;
  }
  // Existing month: insert before the first item that starts later, else after the last item.
  let blockEnd = past.findIndex((line, i) => i > monthIndex && /^#{2,3} /.test(line));
  if (blockEnd === -1) blockEnd = past.length;
  let insertAt = monthIndex + 2; // below the heading and its blank line
  for (let i = monthIndex + 1; i < blockEnd; i += 1) {
    if (!past[i].startsWith('- [')) continue;
    if (startOf(past[i], year, monthHeading) > event.start) break;
    insertAt = i + 1;
  }
  past.splice(insertAt, 0, text);
}
writeFileSync('PAST.md', `${past.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`);
console.log(`Moved ${ended.length} ended event(s) to PAST.md:\n${ended.map((e) => `  - ${e.title} (${e.end})`).join('\n')}`);
