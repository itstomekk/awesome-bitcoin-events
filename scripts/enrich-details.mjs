#!/usr/bin/env node
// Fills data/details.json with a short description and preview image for events
// (`npm run enrich`). These are shown when a row is expanded on the website.
//
// For each event in README.md (add --all to include PAST.md) it fetches the official
// page and reads the organizer's own link-preview tags: og:description / description
// and og:image. Existing entries are kept unless --refresh is passed, and entries with
// "source": "manual" are never overwritten. Always review the diff before committing:
// some sites return cookie banners or generic text.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadEvents } from '../src/lib/load-list.js';

const ALL = process.argv.includes('--all');
const REFRESH = process.argv.includes('--refresh');
const FILE = 'data/details.json';
const MAX_DESCRIPTION = 280;

const details = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const { events } = loadEvents();
const targets = [...new Set(events.filter((e) => ALL || e.file === 'README.md').map((e) => e.url))];

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function meta(html, names) {
  for (const name of names) {
    const tag = html.match(new RegExp(`<meta(?:\\s+[a-z-]+=(?:"[^"]*"|'[^']*'))*\\s+(?:property|name)=["']${name}["'](?:\\s+[a-z-]+=(?:"[^"]*"|'[^']*'))*\\s*/?>`, 'i'))?.[0];
    // Match the quote that opened the attribute, so apostrophes inside "…" survive.
    const content = tag?.match(/content=(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find((v) => v !== undefined);
    if (content && content.trim()) return decode(content.trim());
  }
  return null;
}

// Trims to a whole sentence (or word) under the limit.
function shorten(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.slice(0, MAX_DESCRIPTION);
  const sentence = cut.lastIndexOf('. ');
  return sentence > 80 ? cut.slice(0, sentence + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

let added = 0;
for (const url of targets) {
  if (details[url]?.source === 'manual' || (details[url] && !REFRESH)) continue;
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'awesome-bitcoin-events (+https://github.com/itstomekk/awesome-bitcoin-events)' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) { console.warn(`skip ${url}: HTTP ${response.status}`); continue; }
    const html = await response.text();
    const description = meta(html, ['og:description', 'description', 'twitter:description']);
    let image = meta(html, ['og:image', 'twitter:image']);
    if (image) image = new URL(image, response.url).href;
    if (!description && !image) { console.warn(`skip ${url}: no preview tags`); continue; }
    details[url] = {
      ...(description ? { description: shorten(description) } : {}),
      ...(image && image.startsWith('https://') ? { image } : {}),
      source: 'og',
      fetched: new Date().toISOString().slice(0, 10),
    };
    added += 1;
    console.log(`ok   ${url}`);
  } catch (error) {
    console.warn(`skip ${url}: ${error.message}`);
  }
}

const sorted = Object.fromEntries(Object.entries(details).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(FILE, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`\n${added} entr${added === 1 ? 'y' : 'ies'} added or refreshed in ${FILE}. Review the diff before committing.`);
