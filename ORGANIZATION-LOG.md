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
