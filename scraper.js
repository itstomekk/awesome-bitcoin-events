#!/usr/bin/env node
/**
 * Bitcoin Events Scraper
 * ----------------------
 * Fetches each event website and enriches events.json with:
 *   - og:image  → card background image
 *   - og:description (or meta description) → card blurb
 *   - og:title  → canonical event title
 *
 * Usage:
 *   npm run scrape
 *   node scraper.js [--force]  # --force re-fetches already-enriched events
 *
 * Output: updates events.json in-place.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DATA_FILE = path.join(__dirname, 'events.json');
const CONCURRENCY = 4;
const TIMEOUT_MS = 10_000;
const FORCE = process.argv.includes('--force');

// ---- Minimal HTML tag parser (no external deps needed for OG tags) ----
function extractMeta(html) {
  const result = { title: null, description: null, image: null };

  // og:image
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImage) result.image = ogImage[1].trim();

  // og:description
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
               || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (ogDesc) {
    result.description = ogDesc[1].trim();
  } else {
    // fallback: meta description
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i)
                   || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (metaDesc) result.description = metaDesc[1].trim();
  }

  // og:title
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitle) result.title = ogTitle[1].trim();

  return result;
}

// ---- HTTP fetch (follows up to 3 redirects, returns first 64KB of HTML) ----
function fetchHtml(rawUrl, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(rawUrl); }
    catch (e) { return reject(new Error(`Invalid URL: ${rawUrl}`)); }

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get(rawUrl, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BitcoinEventsBot/1.0)',
        'Accept': 'text/html',
      }
    }, res => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location;
        if (!loc || redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        res.destroy();
        const next = loc.startsWith('http') ? loc : new URL(loc, rawUrl).href;
        return resolve(fetchHtml(next, redirectsLeft - 1));
      }

      if (res.statusCode !== 200) {
        res.destroy();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks = [];
      let total = 0;
      res.on('data', chunk => {
        chunks.push(chunk);
        total += chunk.length;
        if (total > 64 * 1024) res.destroy(); // read enough for head tags
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8', 0, 64 * 1024)));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ---- Process one event ----
async function enrichEvent(event) {
  if (!FORCE && (event.image || event.description)) {
    process.stdout.write(`  [skip] ${event.name}\n`);
    return event; // already enriched
  }

  try {
    process.stdout.write(`  [fetch] ${event.name} (${event.url})\n`);
    const html = await fetchHtml(event.url);
    const meta = extractMeta(html);

    if (meta.image) event.image = meta.image;
    if (meta.description) event.description = meta.description;
    // Don't overwrite event.name with og:title — keep the curated name

    process.stdout.write(`    → image: ${meta.image ? '✓' : '✗'}  description: ${meta.description ? '✓' : '✗'}\n`);
  } catch (err) {
    process.stdout.write(`    ✗ Failed: ${err.message}\n`);
  }

  return event;
}

// ---- Run with limited concurrency ----
async function runPool(items, fn, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: concurrency }, worker);
  await Promise.all(workers);
  return results;
}

// ---- Main ----
async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('events.json not found. Run from the repo root.');
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  console.log(`\n🔍 Scraping ${data.events.length} events (concurrency=${CONCURRENCY})...\n`);
  const start = Date.now();

  data.events = await runPool(data.events, enrichEvent, CONCURRENCY);
  data.updated = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

  const enriched = data.events.filter(e => e.image || e.description).length;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s. ${enriched}/${data.events.length} events enriched.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
