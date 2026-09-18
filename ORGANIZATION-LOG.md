# Organization log

## 2026-09-16 - Source-intake layer created

Created `sources/` as the sole home for source registry and source-review artifacts. The legacy
website files and `events.json` were not moved or rewritten.

No scheduled writer owns this path. Until monitoring is implemented, interactive sessions are the
only writer.

## 2026-09-16 - Interface-neutral data layer added

Created `data/`, `scripts/`, `tests/`, `research/`, and `sources/raw/` for the versioned event and
source datasets, importer, validation tests, review scans, and immutable raw inputs. Legacy frontend
files and `events.json` remain in place and unchanged; `data/events.json` carries the lossless migration.

## 2026-09-16 - Reviewed source scans merged

Added official and historical confirmation scans from BTC Inc, TABConf, Lugano's Plan B Forum, and
Bitcoin Events South Africa. The importer now promotes later official evidence, records verification
timestamps, separates past events, and merges title-year variants without deleting source observations.

## 2026-09-16 - Astro Signal Atlas frontend

Added an Astro static site under `src/`, generated detail pages for every normalized event, responsive filters, a source-confidence presentation, a branded 404 page, and a GitHub Pages Actions workflow. The build target is `dist/`; the legacy root-level frontend remains as a reference. `README.md`, `PLAN.md`, `HANDOFF.md`, `CHANGELOG.md`, and `BUILD-LOG.md` now describe the current source/build/deployment boundary.

## 2026-09-18 - Awesome Bitcoin Events map and next-five research

Renamed the public product surface to Awesome Bitcoin Events, added the Leaflet/OpenStreetMap event map with venue/city precision, geocoded 108 of 109 records, and researched the next five uploaded events. The raw research and public geocoding cache are versioned under `sources/raw/next-five-events-research-2026-09-18.json` and `data/geo-cache.json`.

## 2026-09-16 - Automatic verification and interface fields

Added the sequential Luna verification scan and its raw snapshot. The data contract now includes
delivery mode, inferred IANA timezone, source quality score, unresolved-review state, and official
date correction handling. Source references from review scans are added to the public source directory
only when a real observed URL exists.
