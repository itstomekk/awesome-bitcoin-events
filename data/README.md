# Supporting data contract

The canonical public event records live in `../src/content/events/` as one Markdown file per event. The Astro content collection loads those files, and the generated `README.md` and `EVENTS.md` lists are derived from them.

`data/` contains supporting provenance, geocoding, and migration/reference material. It is not the source of truth for new event records.

## Files

- `sources.json` - supporting source directory and monitoring decision history.
- `geo-cache.json` - supporting OpenStreetMap Nominatim geocoding cache used for map points. Coordinates are approximate unless `coordinates_precision` says `venue`; keep the OSM attribution when reusing this cache.
- `events.json` - migrated data/reference snapshot retained for audit, schema comparison, and migration history. Do not edit it as the canonical event list or add new events there.
- `schema/event-dataset.schema.json` - historical JSON dataset schema used by the migrated reference snapshot and supporting tooling.
- `../sources/raw/` - immutable, dated source captures. A normalized reference record points to its source observations; raw input is never silently overwritten.

## Record rules

- Unknown is `null`, never a guess.
- `dates.timezone` is inferred from observed city/country data when the source does not provide an IANA timezone; ambiguous locations remain `null`.
- Every migrated event has at least one `source_observations` item.
- `official_url` means an organizer-owned or organizer-confirmed page. A listing URL belongs in the source observation.
- Discovery records are kept but must use `verification.state: "discovery_only"`; public UIs can hide or label them. Multiple directory matches without an organizer-owned `official_url` use `needs_review`, not official confirmation.
- Source observations use a stable `source_id` from `sources.json`; `reported_source_id`, when present, preserves the identifier used by the original scan.
- `sources.json.quality.score` is a provisional 1-5 triage score: reviewed canonical sources score 5, mapped community/editorial/discovery sources score by role, and unreviewed sources score 1. It is a filter aid, not a truth claim.
- The `legacy_payload` object holds every original migrated `events.json` field verbatim, so the migration is lossless.
- Future source-specific attributes belong under `extensions`, not in a UI component or a one-off page.

## IDs and source authority

Canonical Markdown filenames and frontmatter are contributor-facing. Rich migrated runtime IDs remain in the maintainer block. A source observation is evidence, not a claim that it is official; the authority and monitoring choice live in `sources.json`, while source snapshots and migrated candidates retain the original observation separately from canonical Markdown records.
