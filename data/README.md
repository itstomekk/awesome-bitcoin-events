# Data contract

`data/` is the versioned source of truth for every interface. The legacy site remains untouched while consumers migrate to this contract.

## Files

- `events.json` - normalized event records. A view can filter by `lifecycle.status`, `verification.state`, delivery mode, type, topic, dates, timezone, or location without relying on display-specific fields.
- `schema/event-dataset.schema.json` - JSON Schema for `events.json`.
- `sources.json` - normalized source directory and monitoring decision history.
- `geo-cache.json` - public OpenStreetMap Nominatim geocoding cache used for map points. Coordinates are approximate unless `coordinates_precision` says `venue`; keep the OSM attribution when reusing this cache.
- `../sources/raw/` - immutable, dated source captures. A normalized record points to its source observations; raw input is never silently overwritten.

## Record rules

- Unknown is `null`, never a guess.
- `dates.timezone` is inferred from observed city/country data when the source does not provide an IANA timezone; ambiguous locations remain `null`.
- Every event has at least one `source_observations` item.
- `official_url` means an organizer-owned or organizer-confirmed page. A listing URL belongs in the source observation.
- Discovery records are kept but must use `verification.state: "discovery_only"`; public UIs can hide or label them. Multiple directory matches without an organizer-owned `official_url` use `needs_review`, not official confirmation.
- Source observations use a stable `source_id` from `sources.json`; `reported_source_id`, when present, preserves the identifier used by the original scan.
- `sources.json.quality.score` is a provisional 1-5 triage score: reviewed canonical sources score 5, mapped community/editorial/discovery sources score by role, and unreviewed sources score 1. It is a filter aid, not a truth claim.
- The `legacy_payload` object holds every original `events.json` field verbatim, so the migration is lossless.
- Future source-specific attributes belong under `extensions`, not in a UI component or a one-off page.

## IDs

Canonical IDs are deterministic: `evt-<normalized-title>-<start-date>-<normalized-city>`. They are stable for known fields, human-readable, and safe to use as URL slugs. A record may expose historical names in `aliases`.

## Source authority

A source observation is evidence, not a claim that it is official. The authority and monitoring choice live in `sources.json`; source snapshots and candidate scans retain the original observation separately from canonical records.
