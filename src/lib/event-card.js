// Per-event 1200x630 link-preview card, in the family of the Awesome Bitcoin Culture cards:
// GPT-made art on the right, a fade into a tint of the event's own colour on the left, the title,
// dates and place in that tint, and the event's logo in a cream tile. Dark and bright variants
// rotate (see src/og/theme.json). Art, logos and theme are generated once by the maintainer
// (see src/og/README.md) and committed; this file only lays them out at build time.
//
// satori draws the text layer, resvg rasterises it, sharp lays it over the art and writes a JPEG
// (about 100 KB; a PNG of the same card would be 15x larger).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { cardText } from './og-card.js';

const OG_DIR = path.join(process.cwd(), 'src', 'og');
let theme;
function themeData() {
  if (!theme) {
    const file = path.join(OG_DIR, 'theme.json');
    theme = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }
  return theme;
}

/** True when this event has committed art, i.e. it gets a card of its own. */
export function hasEventCard(slug) {
  return Boolean(themeData()[slug]) && existsSync(path.join(OG_DIR, 'art', `${slug}.jpg`));
}

// --- colour --------------------------------------------------------------------------
function toHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max ? d / max : 0, max];
}
function fromHsv(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
const darkShade = (c) => { const [h, s] = toHsv(c); return fromHsv(h, Math.min(s, 0.7), 0.13); };
const lightShade = (c) => { const [h, s] = toHsv(c); return fromHsv(h, Math.min(s * 0.35, 0.22), 0.965); };
const accentOnDark = (c) => { const [h, s, v] = toHsv(c); return fromHsv(h, s, Math.max(v, 0.85)); };
const accentOnLight = (c) => { const [h, s, v] = toHsv(c); return fromHsv(h, Math.min(1, s * 1.05), Math.min(v, 0.62)); };
const rgba = (hex, a) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')},${a})`;

// --- fonts (Culture's pair: Archivo Black titles, Space Mono Bold labels) --------------
let fonts;
function loadFonts() {
  if (!fonts) {
    const f = (name) => readFileSync(path.join(OG_DIR, 'fonts', name));
    fonts = [
      { name: 'Archivo', data: f('ArchivoBlack.ttf'), weight: 400, style: 'normal' },
      { name: 'Mono', data: f('SpaceMono-Bold.ttf'), weight: 700, style: 'normal' },
    ];
  }
  return fonts;
}

const el = (type, style, children, extra = {}) => ({ type, props: { style: { display: 'flex', ...style }, children, ...extra } });

function titleSize(n) {
  return n <= 14 ? 92 : n <= 22 ? 76 : n <= 32 ? 62 : n <= 44 ? 50 : 42;
}

const PIN_PATH = 'M12 0C5.4 0 0 5.2 0 11.7 0 20 12 30 12 30s12-10 12-18.3C24 5.2 18.6 0 12 0Zm0 16.5a4.8 4.8 0 1 1 0-9.6 4.8 4.8 0 0 1 0 9.6Z';
const pin = (color) => ({
  type: 'svg',
  props: { width: 22, height: 27, viewBox: '0 0 24 30', children: { type: 'path', props: { d: PIN_PATH, fill: color } } },
});

/** @param {{ slug: string, title: string, dateLabel: string, start: string, where: string, type: string }} e */
export async function renderEventCard(e) {
  const t = themeData()[e.slug];
  const bright = t.style.endsWith('bright');
  const shade = bright ? lightShade(t.color) : darkShade(t.color);
  const ink = bright ? '#1c1815' : '#f2f0e9';
  const accent = bright ? accentOnLight(t.color) : accentOnDark(t.color);
  const title = cardText(e.title);

  const logoFile = t.logo ? path.join(OG_DIR, 'logos', `${e.slug}.png`) : '';
  const logo = logoFile && existsSync(logoFile)
    ? el('div', { position: 'absolute', right: 48, top: 40, width: 96, height: 96, padding: 10, background: '#f5f1e8', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, [
      { type: 'img', props: { src: `data:image/png;base64,${readFileSync(logoFile).toString('base64')}`, style: { maxWidth: 76, maxHeight: 76 } } },
    ])
    : null;

  const tree = el('div', { position: 'relative', width: 1200, height: 630, color: ink, fontFamily: 'Mono', fontWeight: 700 }, [
    el('div', { position: 'absolute', left: 0, top: 0, width: 1200, height: 630, backgroundImage: `linear-gradient(90deg, ${shade} 0%, ${rgba(shade, 0.95)} 30%, ${rgba(shade, 0.6)} 46%, ${rgba(shade, 0)} 64%)` }, ''),
    el('div', { position: 'absolute', left: 56, top: 46, alignItems: 'center', fontSize: 15, letterSpacing: 3, textTransform: 'uppercase' }, [
      el('div', { marginRight: 12 }, [pin(accent)]),
      el('div', {}, 'Awesome Bitcoin Events'),
    ]),
    ...(logo ? [logo] : []),
    el('div', { position: 'absolute', left: 56, top: 110, width: 560, height: 450, flexDirection: 'column', justifyContent: 'center' }, [
      el('div', { fontFamily: 'Archivo', fontWeight: 400, fontSize: titleSize(title.length), lineHeight: 1.02, letterSpacing: -1.5, lineClamp: 3 }, title),
      el('div', { width: 84, height: 6, background: accent, marginTop: 26, marginBottom: 22 }, ''),
      el('div', { fontSize: 26, color: accent }, cardText(`${e.dateLabel} ${e.start.slice(0, 4)}`)),
      el('div', { fontSize: 22, marginTop: 8 }, cardText(e.where)),
    ]),
    el('div', { position: 'absolute', left: 56, bottom: 40, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7 }, cardText(e.type)),
  ]);

  const svg = await satori(tree, { width: 1200, height: 630, fonts: loadFonts() });
  const overlay = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return sharp(path.join(OG_DIR, 'art', `${e.slug}.jpg`))
    .resize(1200, 630, { fit: 'cover', position: 'right' })
    .composite([{ input: overlay }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}
