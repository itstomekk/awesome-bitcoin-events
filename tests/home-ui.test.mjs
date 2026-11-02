// Home-page UI changes: the floating project logo (was the GitHub mark), the past star's
// missing outline, city-zoom star separation, the full-width Support bar and the floating
// Add-event button. These assert the source, not the rendered page (see the Playwright check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const globalCss = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const supportCss = readFileSync(new URL('../public/support.css', import.meta.url), 'utf8');

test('the masthead shows the project logo as the floating GitHub link and no left title logo', () => {
  assert.doesNotMatch(layout, /mast-icon/);
  assert.match(layout, /class="mast-gh"[^>]*><img src=\{`\$\{base\}icon\.svg`\}/);
  // The floating logo keeps a rounded-square clip, not the GitHub mark's circle.
  assert.match(globalCss, /border-radius: 27%;/);
  assert.match(globalCss, /\.mast-gh svg, \.mast-gh img \{/);
});

test('past event stars have no black outline; upcoming keep it', () => {
  assert.match(page, /const stroke = past \? '' : 'stroke="#000"/);
  // Past stars are the only ones that lose the stroke.
  assert.match(page, /fill="\$\{color\}" \$\{stroke\}\/>/);
});

test('city zoom separates event stars by their full size, outline included', () => {
  assert.match(page, /CITY_ZOOM\s*=\s*10/);
  assert.match(page, /CITY_GAP\s*=\s*2\.2/);
  assert.match(page, /group === 'x' && city \? CITY_GAP : 0\.5/);
  // The hit circle is as wide as the star's real edge.
  assert.match(page, /radius: starExtent\(p\)/);
});

test('the past-event legend swatch has no black outline', () => {
  assert.match(globalCss, /\.atlas-key i\.x\.past\s*\{[^}]*background:\s*transparent/);
});

test('the floating Add-event button is wired to the list visibility', () => {
  assert.match(page, /class="fab-add"/);
  assert.match(page, /aria-label="Add event"/);
  assert.match(page, /IntersectionObserver/);
  assert.match(page, /fabEvents = view === 'events'/);
  assert.match(globalCss, /\.fab-add\s*\{/);
});

test('the home Support button is a full-width bar filled by --p and shows sats on mobile', () => {
  // The button sits at the very bottom, after the How it works section, spanning the page.
  assert.match(page, /<\/section>\s*\n\s*<p class="about-support"><button type="button" id="sup" class="supb"/);
  assert.match(supportCss, /\.about-support \.supb\s*\{[^}]*width:100%/);
  assert.match(supportCss, /\.about-support \.supb\s*\{[^}]*var\(--p\) 100%/);
  // Loading placeholder stays visible until support.js fills the count; no mobile hide.
  assert.match(supportCss, /\.supn:empty::before\{content:"…"\}/);
  assert.doesNotMatch(supportCss, /max-width:420px\)\{\.supn\{display:none\}/);
});
