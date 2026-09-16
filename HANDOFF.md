# Handoff

Updated: 2026-09-16

## Current truth

GitHub files are the source of truth. There is no cPanel database or scheduler; the latest local
changes are ready to commit and push.
The legacy frontend and its `events.json` were deliberately left untouched.

The new versioned data layer is ready:

- `data/events.json` contains 108 normalized records: 61 lossless legacy migrations and 47 reviewed source-scan records.
- `data/sources.json` contains 113 unique sources built from 119 public source records, including all 102 exported Notion source records.
- `data/schema/event-dataset.schema.json` defines the UI-neutral contract.
- `sources/raw/luna-source-scan-2026-09-16.json` is byte-identical to the review scan stored in `research/`.
- Additional reviewed scans are preserved in `sources/raw/standalone-scan-2026-09-16.json` and `sources/raw/historical-confirmation-scan-2026-09-16.json`.

The 47 imported records retain their original source evidence. Their present verification split is
9 `official_page_seen`, 19 `discovery_only`, and 19 `needs_review`. Discovery and review candidates
must not be presented as confirmed organizer listings.

## First source verdict

`https://bitcoin-bundesverband.de/en/events/` was reviewed on 2026-09-16.

- It exposed one event: BTC Prague 2026, June 10-13, Prague.
- That event was already past at review time.
- The page advertises iCal export, but the supplied list export URL returned HTTP 404; the event page itself is accessible.
- Decision: retain as a German discovery source with a 30-day probe cadence. Upgrade only after a current, unique event or a working structured feed appears.

## Verification performed

- Thirteen unit tests pass: legacy migration, source-directory construction, candidate import, raw snapshot retention, source-ID resolution, verification downgrade, date handling, and duplicate merging.
- `data/events.json` validates against its JSON Schema.
- Every imported source observation resolves to an ID in `data/sources.json`.
- Duplicate title variants are merged using normalized title, date range, and city; a later official scan can promote an existing discovery record.
- `git diff --check` passes.

## Next action

Review the 19 `needs_review` candidates against organizer-owned pages, then create thin calendar
and map consumers from `data/events.json`. Luna collection attempts currently hit the provider's
HTTP 429 usage limit; direct web research remains available.
