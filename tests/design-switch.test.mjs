// Guards the design switcher: the poster stylesheet must never change the default (classic) look,
// and the switcher markup and script must stay wired together.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const poster = readFileSync(new URL('../src/styles/design-poster.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const global = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const SCOPE = 'html[data-design="poster"]';

// Every selector in the poster file (top level and inside @media) must start with the scope.
function selectors(css) {
  const out = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const walk = (text) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const head = text.slice(i, open).trim();
      let depth = 1, k = open + 1;
      while (depth) { if (text[k] === '{') depth++; else if (text[k] === '}') depth--; k++; }
      if (head.startsWith('@media')) walk(text.slice(open + 1, k - 1));
      else out.push(...head.split(',').map((s) => s.trim()));
      i = k;
    }
  };
  walk(stripped);
  return out;
}

test('every poster selector is scoped to html[data-design="poster"]', () => {
  const all = selectors(poster);
  assert.ok(all.length > 100, `expected many selectors, got ${all.length}`);
  const loose = all.filter((s) => !s.startsWith(SCOPE));
  assert.deepEqual(loose, []);
});

test('poster file has no @import and no @font-face (fonts load only when poster is chosen)', () => {
  assert.ok(!/@import|@font-face/.test(poster));
});

test('classic fonts stay the default and the poster fonts are not in global.css', () => {
  assert.match(global, /Hanken\+Grotesk/);
  assert.ok(!/Archivo\+Black|Space\+Mono/.test(global));
});

test('layout wires the switcher: head script, both buttons, saved key, poster stylesheet after global', () => {
  assert.match(layout, /localStorage/);
  assert.match(layout, /abe-design/);
  assert.match(layout, /data-design-choice="classic"/);
  assert.match(layout, /data-design-choice="poster"/);
  assert.ok(layout.indexOf("global.css") < layout.indexOf("design-poster.css"));
  assert.match(layout, /id="theme-color-meta"/);
});

test('the default design is classic when nothing is saved', () => {
  assert.match(layout, /\? 'poster' : 'classic', false\)/);
});
