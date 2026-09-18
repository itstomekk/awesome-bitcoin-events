# Build log

## 2026-09-16 — Astro Signal Atlas foundation

- Replaced the GitHub Pages build target with an Astro static site while retaining the old root-level frontend as a legacy reference.
- Added a reusable layout, event card component, data helpers, home calendar, generated event detail routes, and branded 404 page.
- Connected the UI directly to `data/events.json` (108 records) and displayed verification/source states instead of implying every record is official.
- Added search, upcoming/all/past tabs, year/region/type filters, and an official-page-only filter.
- Added `astro.config.mjs`, `.gitignore`, `package-lock.json`, and the Actions workflow at `.github/workflows/pages.yml`.
- Production build verified with the project base path: 110 static pages generated, including 108 event routes.
- `git diff --check` passed. Existing Python test suite passed: 15 tests.
- `npm audit --omit=dev --audit-level=high` reported 0 production vulnerabilities.

## Verification notes

The automated browser sandbox could not open the local HTTP server because it blocks private localhost URLs. The desktop preview pane was also unavailable in this headless session, so visual interaction testing remains a local/manual follow-up. Static build output, route count, base-path links, data count, and the repository test suite were verified directly.
