// 1200x630 link-preview cards, drawn at build time with satori (layout) and resvg (PNG).
// Fonts are the site's own (Newsreader for titles, Hanken Grotesk for labels), taken from the
// @fontsource packages; the latin-ext files cover the diacritics in event and city names.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const PAPER = '#eef1f5';
const INK = '#11161d';
const INK_2 = '#2a323d';
const MUTED = '#5a6471';
const ACCENT = '#f7931a';

let fonts;
function loadFonts() {
  if (fonts) return fonts;
  const file = (pkg, name) => readFileSync(path.join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', name));
  fonts = [
    { name: 'Newsreader', data: file('newsreader', 'newsreader-latin-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'Newsreader', data: file('newsreader', 'newsreader-latin-ext-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'Hanken', data: file('hanken-grotesk', 'hanken-grotesk-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Hanken', data: file('hanken-grotesk', 'hanken-grotesk-latin-ext-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Hanken', data: file('hanken-grotesk', 'hanken-grotesk-latin-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'Hanken', data: file('hanken-grotesk', 'hanken-grotesk-latin-ext-600-normal.woff'), weight: 600, style: 'normal' },
  ];
  return fonts;
}

// The bundled fonts have no Bitcoin sign or Vietnamese stacked accents: swap or strip them
// rather than draw missing-glyph boxes.
export function cardText(value) {
  return String(value ?? '')
    .replaceAll('₿', 'B')
    .normalize('NFC')
    .replace(/[^\u0000-\u024F\u2010-\u2027\u20AC]/g, (ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\u0000-\u024F]/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

const el = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });

function titleSize(title) {
  const n = title.length;
  if (n <= 18) return 124;
  if (n <= 30) return 100;
  if (n <= 46) return 82;
  if (n <= 70) return 66;
  return 54;
}

export async function renderCard({ kicker, title, line, host = 'awesomebitcoinevents.com' }) {
  const t = cardText(title);
  const tree = el('div', { width: 1200, height: 630, background: PAPER, fontFamily: 'Hanken', color: INK }, [
    el('div', { width: 20, height: 630, background: ACCENT }, ''),
    el('div', { flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '58px 72px 54px 64px' }, [
      el('div', { alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { alignItems: 'center' }, [
          el('div', { width: 22, height: 22, background: ACCENT, marginRight: 16 }, ''),
          el('div', { fontSize: 26, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: INK_2 }, 'Awesome Bitcoin Events'),
        ]),
        el('div', { fontSize: 26, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: MUTED }, cardText(kicker)),
      ]),
      el('div', { fontFamily: 'Newsreader', fontWeight: 600, fontSize: titleSize(t), lineHeight: 1.04, letterSpacing: -1.5, color: INK, lineClamp: 3, textWrap: 'balance' }, t),
      el('div', { alignItems: 'flex-end', justifyContent: 'space-between' }, [
        el('div', { fontSize: 38, fontWeight: 500, color: INK_2, maxWidth: 820 }, cardText(line)),
        el('div', { fontSize: 28, fontWeight: 600, color: INK_2 }, host),
      ]),
    ]),
  ]);
  const svg = await satori(tree, { width: 1200, height: 630, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
