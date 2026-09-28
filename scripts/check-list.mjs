#!/usr/bin/env node
// Validates README.md, PAST.md and MEETUPS.md: format of every event line, real dates, month
// headings, allowed types, duplicates and date order. Run with `npm run check`.
// CI runs this on every pull request; errors point at file:line.
import { loadEvents, loadPlaces, loadMeetups } from '../src/lib/load-list.js';

const today = new Date().toISOString().slice(0, 10);
const { events, errors } = loadEvents();
const places = loadPlaces();
const meetupResult = loadMeetups();
errors.push(...meetupResult.errors);
const seenMeetups = new Map();
for (const meetup of meetupResult.meetups) {
  const key = meetup.url.toLowerCase().replace(/\/$/, '');
  if (seenMeetups.has(key)) errors.push(`${meetup.file}:${meetup.line}: same link as ${seenMeetups.get(key)}`);
  else seenMeetups.set(key, `${meetup.file}:${meetup.line}`);
}

// Warnings never fail CI: they are reminders for maintainers.
const warnings = [];
for (const event of events) {
  if (event.file === 'README.md' && event.end < today) {
    warnings.push(`${event.file}:${event.line}: "${event.title}" has ended; run \`npm run archive\` to move it to PAST.md`);
  }
  if (!event.online && !places[event.where]) {
    warnings.push(`${event.file}:${event.line}: no map point for "${event.where}" (add it to data/places.json to show it on the map)`);
  }
  if (event.url.startsWith('http://')) {
    warnings.push(`${event.file}:${event.line}: "${event.url}" uses http://; use https:// if the site supports it`);
  }
}

for (const meetup of meetupResult.meetups) {
  if (!meetup.online && !places[meetup.where]) {
    warnings.push(`${meetup.file}:${meetup.line}: no map point for "${meetup.where}" (add it to data/places.json to show it on the map)`);
  }
}

warnings.forEach((warning) => console.warn(`warning  ${warning}`));
if (errors.length) {
  errors.forEach((error) => console.error(`error    ${error}`));
  console.error(`\n${errors.length} error(s). See CONTRIBUTING.md for the list format.`);
  process.exit(1);
}
console.log(`OK: ${events.length} events (${events.filter((e) => e.file === 'README.md').length} in README.md), ${meetupResult.meetups.length} meetups, ${warnings.length} warning(s).`);
