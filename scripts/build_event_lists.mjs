#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const START_MARKER = '<!-- EVENTS:UPCOMING:START -->';
const END_MARKER = '<!-- EVENTS:UPCOMING:END -->';
const AS_OF_MARKER_PREFIX = '<!-- EVENTS:GENERATED-AS-OF:';
const AS_OF_MARKER_SUFFIX = ' -->';
const AS_OF_MARKER_PATTERN = /<!-- EVENTS:GENERATED-AS-OF:([^ ]+) -->/g;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function usageError(message) {
  throw new Error(`${message}\nUsage: node scripts/build_event_lists.mjs [--check] [--today YYYY-MM-DD] [--root PATH]`);
}

function parseArgs(argv) {
  const options = { check: false, today: null, todayExplicit: false, root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') {
      options.check = true;
    } else if (argument === '--today') {
      options.today = argv[++index];
      if (!options.today) usageError('--today requires a date');
      options.todayExplicit = true;
    } else if (argument === '--root') {
      const root = argv[++index];
      if (!root) usageError('--root requires a path');
      options.root = path.resolve(root);
    } else if (argument === '--help' || argument === '-h') {
      console.log('Usage: node scripts/build_event_lists.mjs [--check] [--today YYYY-MM-DD] [--root PATH]');
      process.exit(0);
    } else {
      usageError(`Unknown option: ${argument}`);
    }
  }
  if (!options.todayExplicit && !options.check) options.today = new Date().toISOString().slice(0, 10);
  if (options.today) validateDate(options.today, 'today');
  return options;
}

function validateDate(value, label) {
  if (!DATE_PATTERN.test(value)) usageError(`${label} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    usageError(`${label} is not a real calendar date: ${value}`);
  }
}

function asOfMarker(date) {
  return `${AS_OF_MARKER_PREFIX}${date}${AS_OF_MARKER_SUFFIX}`;
}

function readAsOfMarker(text, label) {
  const markers = [...text.matchAll(AS_OF_MARKER_PATTERN)];
  if (markers.length !== 1) {
    throw new Error(`${label} must contain exactly one generated as-of marker`);
  }
  const date = markers[0][1];
  validateDate(date, `${label} generated as-of marker`);
  return date;
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await markdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function dateValue(value, field, filePath) {
  const date = typeof value === 'string' ? value : value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
  validateDate(date, `${field} in ${filePath}`);
  return date;
}

function textValue(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function validateHttpUrl(value, label) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${label} must be an HTTP(S) URL`);
  const markdownBreakingCharacters = new Set(['\\', '(', ')', '[', ']', '<', '>', '`', '|']);
  if ([...value].some((character) => markdownBreakingCharacters.has(character) || /\s|[\p{Cc}\p{Cf}]/u.test(character))) {
    throw new Error(`${label} must be a clean HTTP(S) URL without whitespace or Markdown-breaking characters`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid HTTP(S) URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must be an HTTP(S) URL`);
  }
  return parsed.href;
}

function readEvent(filePath, content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`Missing YAML frontmatter: ${filePath}`);
  const data = YAML.parse(match[1]) ?? {};
  const title = textValue(data.title);
  const start = dateValue(data.start, 'start', filePath);
  const end = dateValue(data.end ?? data.start, 'end', filePath);
  if (!title) throw new Error(`Missing title: ${filePath}`);
  if (end < start) throw new Error(`end precedes start: ${filePath}`);

  const maintainer = data.maintainer ?? {};
  const maintainerLinks = maintainer.links ?? {};
  const publicUrl = data.url || maintainerLinks.official_url || null;
  const url = validateHttpUrl(publicUrl, `official URL in ${filePath}`);
  const type = textValue(
    data.format ?? data.type ?? maintainer.classification?.event_type ?? maintainer.event_type,
    '—',
  );
  const location = textValue(data.location, '—');
  return {
    title,
    start,
    end,
    location,
    type,
    url,
    filePath,
  };
}

async function loadEvents(root) {
  const directory = path.join(root, 'src', 'content', 'events');
  const files = await markdownFiles(directory);
  if (files.length === 0) throw new Error(`No event Markdown files found under ${directory}`);
  const events = [];
  for (const filePath of files) {
    events.push(readEvent(filePath, await readFile(filePath, 'utf8')));
  }
  return events.sort((left, right) =>
    left.start.localeCompare(right.start) || left.end.localeCompare(right.end) || left.title.localeCompare(right.title) || left.filePath.localeCompare(right.filePath),
  );
}

function escapeTable(value) {
  return String(value ?? '—')
    .replaceAll('\\', '\\\\')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '\\|')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('`', '\\`')
    .replaceAll('*', '\\*')
    .replaceAll('~', '\\~')
    .replaceAll('\r', '')
    .replaceAll('\n', '<br>')
    .replace(/(^|[\s([{>])(_+)(?=\S)/gu, '$1\\$2')
    .replace(/(\S)(_+)(?=$|[\s)\]}.,!?;:])/gu, '$1\\$2');
}

function eventDate(event) {
  return event.start === event.end ? event.start : `${event.start} – ${event.end}`;
}

function linkCell(event) {
  return event.url ? `[Official](${event.url})` : '—';
}

function renderTable(events) {
  const rows = [
    '| Date | Event | Location | Type | Link |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const event of events) {
    rows.push(`| ${escapeTable(eventDate(event))} | ${escapeTable(event.title)} | ${escapeTable(event.location)} | ${escapeTable(event.type)} | ${linkCell(event)} |`);
  }
  return rows.join('\n');
}

function renderReadme(readme, upcoming, today) {
  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README.md must contain both upcoming-list markers: ${START_MARKER} before ${END_MARKER}`);
  }
  if (readme.indexOf(START_MARKER, start + START_MARKER.length) !== -1 || readme.indexOf(END_MARKER, end + END_MARKER.length) !== -1) {
    throw new Error('README.md must contain each upcoming-list marker exactly once');
  }
  const generated = `${START_MARKER}\n${asOfMarker(today)}\n${renderTable(upcoming)}\n${END_MARKER}`;
  return `${readme.slice(0, start)}${generated}${readme.slice(end + END_MARKER.length)}`;
}

function renderArchive(events, today) {
  const upcoming = events.filter((event) => event.end >= today);
  const past = events.filter((event) => event.end < today);
  const years = new Map();
  for (const event of past) {
    const year = event.start.slice(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(event);
  }

  const lines = [
    '# Bitcoin events archive',
    '',
    'A complete, generated list of Bitcoin conferences, meetups, retreats, festivals, and other community events. Upcoming events are listed first; past events are grouped by year below.',
    '',
    '_Generated from the canonical Markdown event files in [`src/content/events/`](src/content/events/)._',
    asOfMarker(today),
    `_Generated as of ${today}._`,
    '',
    '## Upcoming events',
    '',
    renderTable(upcoming),
    '',
    '## Past events',
    '',
  ];
  if (years.size === 0) {
    lines.push('No past events are listed yet.');
  } else {
    for (const year of [...years.keys()].sort((left, right) => right.localeCompare(left))) {
      lines.push(`<details>`, `<summary>${year}</summary>`, '', renderTable(years.get(year)), '', '</details>', '');
    }
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

async function updateFile(filePath, expected, check, changedFiles) {
  let current;
  try {
    current = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    current = null;
  }
  if (current === expected) return;
  changedFiles.push(path.basename(filePath));
  if (!check) await writeFile(filePath, expected, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = options.root;
  const events = await loadEvents(root);
  const readmePath = path.join(root, 'README.md');
  const archivePath = path.join(root, 'EVENTS.md');
  const readme = await readFile(readmePath, 'utf8');
  const readmeStart = readme.indexOf(START_MARKER);
  const readmeEnd = readme.indexOf(END_MARKER);
  if (readmeStart === -1 || readmeEnd === -1 || readmeEnd < readmeStart) {
    throw new Error(`README.md must contain both upcoming-list markers: ${START_MARKER} before ${END_MARKER}`);
  }
  const archive = await readFile(archivePath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (options.check && !options.todayExplicit) {
    const readmeBlock = readme.slice(readmeStart + START_MARKER.length, readmeEnd);
    options.today = readAsOfMarker(readmeBlock, 'README generated block');
    if (archive === null) throw new Error('EVENTS.md must contain exactly one generated as-of marker');
    const archiveToday = readAsOfMarker(archive, 'EVENTS.md');
    if (archiveToday !== options.today) {
      throw new Error(`README.md and EVENTS.md generated as-of markers disagree: ${options.today} vs ${archiveToday}`);
    }
  }
  const upcoming = events.filter((event) => event.end >= options.today);
  const expectedReadme = renderReadme(readme, upcoming, options.today);
  const expectedArchive = renderArchive(events, options.today);
  const changedFiles = [];
  await updateFile(readmePath, expectedReadme, options.check, changedFiles);
  await updateFile(archivePath, expectedArchive, options.check, changedFiles);

  if (options.check && changedFiles.length > 0) {
    throw new Error(`Generated event lists are stale: ${changedFiles.join(', ')}`);
  }
  if (!options.check) {
    console.log(`Generated README.md and EVENTS.md from ${events.length} event files.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
