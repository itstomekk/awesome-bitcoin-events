# Bitcoin events data plan

## Goal

Build a trustworthy, Bitcoin-focused events dataset before committing to a final interface.

A source is evidence, not truth. Every published event must retain its source, raw snapshot,
verification state, and review history.

## Current state

- Legacy website and `events.json` are preserved untouched.
- `events.json` is stale: it identifies itself as 2025, while the README contains a 2026 list.
- `sources/registry.json` is the new source registry and monitoring-policy home.
- No automated polling or external database is enabled.

## Phase 1 - source intake and data contract

- [x] Create a source registry with source roles and monitoring policy.
- [x] Review the first submitted source: Bitcoin Bundesverband.
- [x] Define the canonical event schema and the immutable raw-snapshot schema.
- [x] Map 102 Notion source records and the repository registry into 110 unique public source records.
- [x] Losslessly migrate all 61 legacy event records into the interface-neutral dataset.
- [x] Import a first reviewed collection scan: 44 current/future candidate events, with raw snapshot and source provenance.
- [ ] Add 20-30 manually verified events from 5-8 representative source types.
- [x] Classify mapped sources as canonical, discovery, community, editorial, or unreviewed.

### Source health decision

A review records:

- access method: API, RSS, iCal, static HTML, JavaScript-only, or manual;
- yield: events found, current events, unique events, and duplicates;
- authority: official organiser, community body, or third-party directory;
- freshness: new or changed events during successive checks;
- parser cost and reliability.

The result assigns a 1, 7, 14, or 30 day cadence. A source is never put on a cron before its
manual review yields a stable access path.

## Phase 2 - tested ingestion

- [x] Write tests before an importer is implemented.
- [x] Save immutable raw snapshots before normalisation.
- [x] Emit normalised candidate records without modifying the legacy event list.
- [ ] Add deterministic deduplication using official URL, event series, date range, and location.
- [x] Add validation that rejects missing source provenance, malformed dates, and past events presented as upcoming.

## Phase 3 - small data prototypes

Start after 20-30 verified current or future events, not after a complete database.

- [ ] Calendar/list prototype for dates, topic, country, and source confidence.
- [ ] Map prototype for location precision and clustering.
- [ ] Review which missing fields block useful browsing, then revise schema before visual polish.

## Phase 4 - monitoring and public contribution

- [ ] Enable monitoring only for sources with proven value.
- [ ] Add an intake queue for user-submitted URLs and event reports.
- [ ] Add a review workflow and change history.
- [x] Keep the project GitHub-native: versioned JSON, raw snapshots, and review history. No cPanel database is planned.

## Operating rule

When Tomek sends a source URL, assess it before automating it. The default output is a source review,
not an unverified event import or a new cron job.
