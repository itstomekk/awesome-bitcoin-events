# Handoff

Updated: 2026-09-16

## Current truth

GitHub files are the source of truth. There is no cPanel database or scheduler. The repository now has an Astro static frontend that builds from the versioned `data/` layer; the previous root-level frontend remains untouched as a legacy reference.

The data layer remains:

- `data/events.json` contains 108 normalized records: 61 lossless legacy migrations and 47 reviewed source-scan records.
- `data/sources.json` contains 130 unique sources built from 139 public source records, including all 102 exported Notion source records and observed URLs from automatic verification scans.
- `data/schema/event-dataset.schema.json` defines the UI-neutral contract.
- `sources/raw/` preserves immutable research snapshots.

The Astro build adds:

- `src/pages/index.astro` — source-aware calendar with upcoming-first filtering, search, year/region/type filters, and official-page-only mode.
- `src/pages/events/[id].astro` — one static evidence/detail page for every event record.
- `src/components/EventCard.astro`, `src/layouts/BaseLayout.astro`, and `src/lib/events.js` — shared rendering and display helpers.
- `src/styles/global.css` — responsive Signal Atlas visual system.
- `.github/workflows/pages.yml` — Node 20 build and GitHub Pages deployment via Actions.

## Verification performed

- `npm run build` passes with no Astro warnings and generates 110 pages: home, 108 event routes, and 404.
- A build with `PUBLIC_BASE_PATH=/awesome-bitcoin-events` passes; generated links use `/awesome-bitcoin-events/events/.../` and no concatenated base-path links remain.
- `python -m pytest -q` passes: 15 tests.
- `npm audit --omit=dev --audit-level=high` reports 0 production vulnerabilities.
- `git diff --check` passes.
- The automated browser sandbox blocked localhost and the desktop preview pane was unavailable, so browser visual/interaction QA remains to be run from an interactive local session.

## Next action

Review the 2 unresolved candidates against organizer-owned pages, then continue adding 20–30 manually verified current/future events from representative source types. After that, evaluate whether coordinates are complete enough for a map consumer. When the repository is pushed, enable Pages with the workflow source and verify the public HTTPS URL and Actions run before calling the deployment live.
