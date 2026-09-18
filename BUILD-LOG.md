# Build log

## 2026-09-16 — Astro Signal Atlas foundation

- Replaced the GitHub Pages build target with an Astro static site while retaining the old root-level frontend as a legacy reference.
- Added a reusable layout, event card component, data helpers, home calendar, generated event detail routes, and branded 404 page.
- Connected the UI directly to `data/events.json` (109 records) and displayed verification/source states instead of implying every record is official.
- Added search, upcoming/all/past tabs, year/region/type filters, and an official-page-only filter.
- Added `astro.config.mjs`, `.gitignore`, `package-lock.json`, and the Actions workflow at `.github/workflows/pages.yml`.
- Production build verified with the project base path: 111 static pages generated, including 109 event routes.
- `git diff --check` passed. Existing Python test suite passed: 15 tests.
- `npm audit --omit=dev --audit-level=high` reported 0 production vulnerabilities.

## 2026-09-18 — LABITCONF 2026 verified import and live deployment

- Researched the official LABITCONF 2026 site plus three independent corroborating sources.
- Added `LABITCONF 2026` for 29 October–1 November 2026 in Buenos Aires, with the main conference dates (30–31 October) and extended Experience-program dates explained in the record.
- Added the canonical source `official-labitconf` and raw evidence at `sources/raw/labitconf-2026-research-2026-09-18.json`.
- Validated 109 event records, 131 sources, source-ID resolution, 15 tests, and a clean Astro build.
- Deployed successfully through GitHub Pages Actions; the live home and LABITCONF detail page were fetched over HTTPS.

## Verification notes

The automated browser sandbox could not open the local HTTP server because it blocks private localhost URLs. The desktop preview pane was also unavailable in this headless session, so visual interaction testing remains a local/manual follow-up. Static build output, route count, base-path links, data count, and the repository test suite were verified directly.
