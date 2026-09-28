#!/usr/bin/env node
// Moves events that have ended from README.md to PAST.md (`npm run archive`).
//
// It only edits the two Markdown files. The year/month tables of both files are
// re-rendered from their parsed rows (README oldest year first, PAST newest year
// first), and the year links under README's "## Contents" are updated. Text outside
// the year sections is left untouched. Review the diff before committing.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseList, renderSections } from '../src/lib/awesome-list.js';

const flag = process.argv.indexOf('--today');
const today = flag > -1 ? process.argv[flag + 1] : new Date().toISOString().slice(0, 10);

const readmeText = readFileSync('README.md', 'utf8');
const pastText = readFileSync('PAST.md', 'utf8');
const readme = parseList(readmeText, 'README.md');
const past = parseList(pastText, 'PAST.md');
const errors = [...readme.errors, ...past.errors];
if (errors.length) {
  console.error(`Fix these first (npm run check):\n${errors.join('\n')}`);
  process.exit(1);
}

const ended = readme.events.filter((event) => event.end < today);
if (!ended.length) {
  console.log('Nothing to archive.');
  process.exit(0);
}
const upcoming = readme.events.filter((event) => event.end >= today);

// Replaces the block of year sections (from the first "## YYYY" up to the next
// non-year "## " heading, or the end of the file) with freshly rendered lines.
function replaceYearSections(text, renderedLines) {
  const lines = text.split('\n');
  const first = lines.findIndex((line) => /^## \d{4}\s*$/.test(line));
  if (first === -1) throw new Error('No "## YYYY" section found');
  let end = lines.findIndex((line, i) => i > first && /^## /.test(line) && !/^## \d{4}\s*$/.test(line));
  if (end === -1) end = lines.length;
  return [...lines.slice(0, first), ...renderedLines, ...lines.slice(end)].join('\n');
}

// README: upcoming events only, and Contents links for the years that remain.
let newReadme = replaceYearSections(readmeText, renderSections(upcoming));
const years = [...new Set(upcoming.map((event) => event.start.slice(0, 4)))].sort();
const readmeLines = newReadme.split('\n');
const firstYearLink = readmeLines.findIndex((line) => /^- \[\d{4}\]\(#\d{4}\)$/.test(line));
if (firstYearLink !== -1) {
  const kept = readmeLines.filter((line) => !/^- \[\d{4}\]\(#\d{4}\)$/.test(line));
  kept.splice(firstYearLink, 0, ...years.map((year) => `- [${year}](#${year})`));
  newReadme = kept.join('\n');
}
writeFileSync('README.md', newReadme.replace(/\n{3,}/g, '\n\n'));

// PAST: everything already archived plus the newly ended events, newest year first.
const newPast = replaceYearSections(pastText, renderSections([...past.events, ...ended], { newestYearFirst: true }));
writeFileSync('PAST.md', `${newPast.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`);

console.log(`Moved ${ended.length} ended event(s) to PAST.md:\n${ended.map((e) => `  - ${e.title} (${e.end})`).join('\n')}`);
