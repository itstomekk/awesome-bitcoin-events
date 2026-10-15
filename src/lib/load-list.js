// Reads the canonical list files from the repository root and parses them.
// Used at build time by the website and by scripts/check-list.mjs.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseList, checkEvents, parseMeetups } from './awesome-list.js';

// README.md holds upcoming events; PAST.md holds the archive. Same format in both.
export const LIST_FILES = ['README.md', 'PAST.md'];

export function loadEvents(root = process.cwd()) {
  const events = [];
  const errors = [];
  for (const file of LIST_FILES) {
    const fullPath = path.join(root, file);
    if (!existsSync(fullPath)) continue;
    const result = parseList(readFileSync(fullPath, 'utf8'), file);
    events.push(...result.events);
    errors.push(...result.errors);
  }
  errors.push(...checkEvents(events));
  return { events, errors };
}

// Map points: "City, Country" (exactly as written in the list) -> [latitude, longitude].
// data/places.json is only a lookup cache for the map, not event data; a missing
// place just means the event has no pin.
export function loadPlaces(root = process.cwd()) {
  const fullPath = path.join(root, 'data', 'places.json');
  return existsSync(fullPath) ? JSON.parse(readFileSync(fullPath, 'utf8')) : {};
}

// Recurring meetups: the "## Meetups" section of README.md.
export function loadMeetups(root = process.cwd()) {
  const fullPath = path.join(root, 'README.md');
  return existsSync(fullPath) ? parseMeetups(readFileSync(fullPath, 'utf8')) : { meetups: [], errors: [] };
}

// Optional extra details shown when an event row is expanded, keyed by the event's
// official URL: { "https://…": { "description": "…", "image": "https://…" } }.
// Filled by `npm run enrich` (then reviewed); hand-written entries have "source": "manual".
export function loadDetails(root = process.cwd()) {
  const fullPath = path.join(root, 'data', 'details.json');
  return existsSync(fullPath) ? JSON.parse(readFileSync(fullPath, 'utf8')) : {};
}
