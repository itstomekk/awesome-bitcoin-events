# Handoff

Updated: 2026-09-16

## Current truth

GitHub files are the source of truth. There is no cPanel database, scheduler, commit, or push yet.
The legacy frontend and its `events.json` were deliberately left untouched.

The new versioned data layer is ready:

- `data/events.json` contains 105 normalized records: 61 lossless legacy migrations and 44 current/future source-scan candidates.
- `data/sources.json` contains 110 unique sources built from 116 public source records, including all 102 exported Notion source records.
- `data/schema/event-dataset.schema.json` defines the UI-neutral contract.
- `sources/raw/luna-source-scan-2026-09-16.json` is byte-identical to the review scan stored in `research/`.

The 44 candidates retain their original source evidence. Their present verification split is 4
`official_page_seen`, 38 `discovery_only`, and 2 `needs_review`. Discovery candidates must not be
presented as confirmed organizer listings.

## First source verdict

`https://bitcoin-bundesverband.de/en/events/` was reviewed on 2026-09-16.

- It exposed one event: BTC Prague 2026, June 10-13, Prague.
- That event was already past at review time.
- The page advertises iCal export, but the supplied list export URL returned HTTP 404; the event page itself is accessible.
- Decision: retain as a German discovery source with a 30-day probe cadence. Upgrade only after a current, unique event or a working structured feed appears.

## Verification performed

- Nine unit tests pass: legacy migration, source-directory construction, candidate import, raw snapshot retention, source-ID resolution, verification downgrade, and stale-date rejection.
- `data/events.json` validates against its JSON Schema.
- Every imported source observation resolves to an ID in `data/sources.json`.
- `git diff --check` passes.

## Next action

Review 20-30 event candidates against organizer-owned pages, add deterministic cross-source
deduplication, then create thin calendar and map consumers from `data/events.json`.
