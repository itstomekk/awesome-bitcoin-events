# Bitcoin events data and site plan

## Goal

Build a trustworthy, Bitcoin-focused events dataset and a polished public calendar that can grow from the same interface-neutral contract.

A source is evidence, not truth. Every published event retains its source, raw snapshot, verification state, and review history.

## Current state

- The legacy website and root-level `events.json` remain preserved as a reference.
- `data/events.json` is the canonical UI input: 109 normalized records, including legacy migrations and reviewed source candidates.
- `data/sources.json` is the canonical source directory.
- `data/geo-cache.json` stores map geocoding results and attribution for venue/city points.
- An Astro static site now consumes the data at build time, renders a map, and deploys through GitHub Pages Actions; no external database is enabled.

## Phase 1 — source intake and data contract

- [x] Create a source registry with source roles and monitoring policy.
- [x] Review the first submitted source: Bitcoin Bundesverband.
- [x] Define the canonical event schema and immutable raw-snapshot schema.
- [x] Map Notion, repository, and reviewed scan sources into unique public source records.
- [x] Losslessly migrate legacy event records into the interface-neutral dataset.
- [x] Import reviewed collection scans with raw snapshots and source provenance.
- [x] Automatically verify candidates against official URLs and preserve unresolved cases.
- [ ] Add 20–30 manually verified events from 5–8 representative source types.
- [x] Classify mapped sources as canonical, discovery, community, editorial, or unreviewed.

## Phase 2 — tested ingestion

- [x] Write tests before an importer is implemented.
- [x] Save immutable raw snapshots before normalization.
- [x] Emit normalized candidate records without modifying the legacy event list.
- [ ] Add deterministic deduplication using official URL, event series, date range, and location.
- [x] Validate source provenance, dates, past-event status, and duplicate merging.

## Phase 3 — public site and data prototypes

- [x] Build an Astro static calendar/list consumer for dates, place, type, and source confidence.
- [x] Generate a dedicated static detail page for every event record.
- [x] Add responsive search and year/region/type/status filters.
- [x] Label discovery, legacy, review, and official records distinctly.
- [ ] Review missing fields that block useful browsing and revise the schema before adding more interface surface.
- [x] Map prototype with venue/city coordinates and an attribution-preserving public geocoding cache.

## Phase 4 — monitoring and public contribution

- [ ] Enable monitoring only for sources with proven value.
- [x] Add an intake queue for user-submitted URLs and event reports.
- [ ] Add a review workflow and change history.
- [x] Keep the project GitHub-native: versioned JSON, raw snapshots, review history, and Pages deployment.
- [x] Enable Pages in repository settings and verify the public HTTPS URL after the first push.

## Operating rule

When Tomek sends a source URL, assess it before automating it. The default output is a source review, not an unverified event import or a new cron job.
