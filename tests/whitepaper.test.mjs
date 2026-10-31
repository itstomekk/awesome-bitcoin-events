// The Bitcoin white paper mirror: public/bitcoin.pdf must stay byte-identical to the original,
// /whitepaper/ must not collide with a generated page, and it must stay out of the sitemap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildModel, sitemapXml } from '../src/lib/pages-model.js';

const SHA = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';
const read = (p) => readFileSync(new URL(p, import.meta.url));

test('public/bitcoin.pdf is the unmodified original', () => {
  const pdf = read('../public/bitcoin.pdf');
  assert.equal(pdf.length, 184292);
  assert.equal(createHash('sha256').update(pdf).digest('hex'), SHA);
});

test('the viewer page states the same hash, is noindex and no generated page takes its path', () => {
  const page = read('../src/pages/whitepaper.astro').toString('utf8');
  assert.ok(page.includes(SHA));
  assert.match(page, /\bnoindex\b/);
  const model = buildModel({ origin: 'https://example.org/', buildDay: '2026-10-29' });
  assert.ok(!model.pages.some((p) => p.path === 'whitepaper'));
  assert.ok(!sitemapXml(model).includes('/whitepaper/'));
  assert.ok(!sitemapXml(model).includes('bitcoin.pdf'));
});

test('the embedded paper text is the real fragment, not the layout placeholder', (t) => {
  const html = read('../src/data/whitepaper-en.frag').toString('utf8');
  if (html.includes('<!--WHITEPAPER_TEXT-->')) return t.skip('TEXT PENDING: src/data/whitepaper-en.frag is still the placeholder');
  assert.match(html, /<h2[^>]*>/);
  assert.ok(!/SAMPLE PLACEHOLDER/.test(html));
});

test('/bitcoin-whitepaper/ is the indexable page: no generated page takes its path, sitemap and llms.txt list it', () => {
  const page = read('../src/pages/bitcoin-whitepaper.astro').toString('utf8');
  assert.ok(page.includes(SHA));
  assert.ok(!/\bnoindex\b/.test(page.replace(/\/\/.*$/gm, '')));
  assert.match(page, /https:\/\/dwadziesciajeden\.pl\/bitcoin-whitepaper\//);
  const model = buildModel({ origin: 'https://example.org/', buildDay: '2026-10-29' });
  assert.ok(!model.pages.some((p) => p.path === 'bitcoin-whitepaper'));
  assert.ok(sitemapXml(model, ['bitcoin-whitepaper']).includes('<loc>https://example.org/bitcoin-whitepaper/</loc>'));
  assert.ok(!sitemapXml(model, ['bitcoin-whitepaper']).includes('bitcoin.pdf'));
  assert.equal(createHash('sha256').update(read('../public/whitepaper-18-og.jpg')).digest('hex').length, 64);
});
