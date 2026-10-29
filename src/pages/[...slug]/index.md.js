// Markdown copy of every indexable generated page, next to its HTML (events/<slug>/index.md).
// Mirrors the page's robots rule: noindex pages get no copy.
import { getModel } from '../../lib/site-model.js';
import { pageMarkdown } from '../../lib/pages-model.js';

export function getStaticPaths() {
  return getModel().pages.filter((p) => p.indexable).map((page) => ({ params: { slug: page.path }, props: { path: page.path } }));
}

export function GET({ props }) {
  const model = getModel();
  const page = model.pages.find((p) => p.path === props.path);
  return new Response(pageMarkdown(page, model.ctx), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
