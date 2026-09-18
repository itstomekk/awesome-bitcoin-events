# Handoff

Updated: 2026-09-18

## Current truth

GitHub files are the source of truth. There is no cPanel database or scheduler. The repository now has an Astro static frontend that builds from the versioned `data/` layer; the previous root-level frontend remains untouched as a legacy reference.

The data layer remains:

- `data/events.json` contains 109 normalized records: 61 lossless legacy migrations and 48 reviewed source-scan records.
- `data/sources.json` contains 133 unique sources built from 142 public source records, including all 102 exported Notion source records and observed URLs from automatic verification scans.
- `data/geo-cache.json` preserves 86 public geocoding lookups; 108 of 109 event records now have a venue or city-centre map point.
- `data/schema/event-dataset.schema.json` defines the UI-neutral contract.
- `sources/raw/` preserves immutable research snapshots, including the LABITCONF 2026 review and the next-five-events research.

The Astro build adds:

- `src/pages/index.astro` — source-aware calendar with an OpenStreetMap/Leaflet event map, upcoming-first filtering, search, year/region/type filters, and official-page-only mode.
- `src/pages/events/[id].astro` — one static evidence/detail page for every event record.
- `src/components/EventCard.astro`, `src/layouts/BaseLayout.astro`, and `src/lib/events.js` — shared rendering and display helpers.
- `src/styles/global.css` — responsive Awesome Bitcoin Events visual system.
- `.github/ISSUE_TEMPLATE/` — public event submission and correction forms.
- `CONTRIBUTING.md` and `docs/REPOSITORY-GUIDE.md` — contributor and maintainer workflow documentation.
- `.github/workflows/pages.yml` — Node 20 build and GitHub Pages deployment via Actions.

## Verification performed

- `npm run build` passes with no Astro warnings and generates 111 pages: home, 109 event routes, and 404.
- The home build includes a Leaflet map with 108 serialized event points; one online event has no geographic point.
- A build with `PUBLIC_BASE_PATH=/awesome-bitcoin-events` passes; generated links use `/awesome-bitcoin-events/events/.../` and no concatenated base-path links remain.
- `python -m pytest -q` passes: 15 tests.
- `npm audit --omit=dev --audit-level=high` reports 0 production vulnerabilities.
- `git diff --check` passes.
- The next five uploaded events were researched; four are promoted/confirmed as official-page records, while Copa Bitcoin remains `needs_review` because public date evidence conflicts.
- GitHub Pages deployment is live at `https://itstomekk.github.io/awesome-bitcoin-events/`; the Actions run and Pages API both report success. Live home and LABITCONF detail content were fetched over HTTPS.
- The automated browser sandbox timed out on the deployed page, so visual interaction QA remains unverified in this session.

## Next action

Review the remaining unresolved candidates against organizer-owned pages, then continue adding 20–30 manually verified current/future events from representative source types. The map now covers 108/109 records; only the online record has no geographic point. Future data and UI changes should be pushed through the same workflow and checked at the public HTTPS URL.
