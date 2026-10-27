// Markdown copy of the list for AI agents and tools, linked from the home page <head>.
// README.md is the source of truth, so this serves it as-is, rebuilt on every deploy.
// Relative links (PAST.md, the README screenshot) are made absolute so they resolve here too.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = 'https://github.com/itstomekk/awesome-bitcoin-events';

export function absolutize(md) {
  return md.replace(/(!?)\[([^\]]*)\]\(\s*([^)\s]+)/g, (match, bang, text, href) => {
    if (/^(https?:|mailto:|#)/i.test(href)) return match;
    const clean = href.replace(/^\.\//, '');
    const base = bang ? 'https://raw.githubusercontent.com/itstomekk/awesome-bitcoin-events/main/' : `${REPO}/blob/main/`;
    return `${bang}[${text}](${base}${clean}`;
  });
}

export function GET() {
  const md = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  return new Response(absolutize(md), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
