// Builds the site model once per build and shares it between all page routes.
import { buildModel } from './pages-model.js';

let cached;

export function getModel() {
  if (!cached) {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    const origin = new URL(base, import.meta.env.SITE || 'http://localhost/').href;
    cached = buildModel({ origin, buildDay: new Date().toISOString().slice(0, 10) });
  }
  return cached;
}
