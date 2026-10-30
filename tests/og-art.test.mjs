// The per-event share-card assets must agree with each other. Coverage is not required: a new event
// has no art until the maintainer generates it, and the page falls back to a plain card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const OG = path.join(process.cwd(), 'src', 'og');
const theme = JSON.parse(readFileSync(path.join(OG, 'theme.json'), 'utf8'));
const slugs = Object.keys(theme);

test('every themed event has its art, and every art file is themed', () => {
  assert.ok(slugs.length > 0);
  for (const slug of slugs) assert.ok(existsSync(path.join(OG, 'art', `${slug}.jpg`)), `missing art for ${slug}`);
  const files = readdirSync(path.join(OG, 'art')).map((f) => f.replace(/\.jpg$/, ''));
  for (const slug of files) assert.ok(theme[slug], `art without theme: ${slug}`);
});

test('theme entries are valid and logos exist when declared', () => {
  const styles = ['cine', 'cards', 'flat'].flatMap((s) => [`${s}-dark`, `${s}-bright`]);
  for (const [slug, t] of Object.entries(theme)) {
    assert.match(t.color, /^#[0-9a-f]{6}$/, `${slug} color`);
    assert.ok(styles.includes(t.style), `${slug} style ${t.style}`);
    if (t.logo) assert.ok(existsSync(path.join(OG, 'logos', `${slug}.png`)), `missing logo for ${slug}`);
  }
});

test('card fonts are present', () => {
  for (const f of ['ArchivoBlack.ttf', 'SpaceMono-Bold.ttf']) assert.ok(existsSync(path.join(OG, 'fonts', f)), f);
});

test('every themed slug is a real event page', async () => {
  const { buildModel } = await import('../src/lib/pages-model.js');
  const model = buildModel({ origin: 'https://awesomebitcoinevents.com/', buildDay: '2026-01-01' });
  const real = new Set(model.pages.filter((p) => p.kind === 'event').map((p) => p.event.slug));
  for (const slug of slugs) assert.ok(real.has(slug), `themed slug is not an event page: ${slug}`);
});
