# Repository guide

## Purpose

Awesome Bitcoin Events is a community-maintained, source-aware directory of Bitcoin events. The canonical records are one Markdown file per event; the Astro site and generated lists are views of that contributor-friendly structure. There is no live database or private admin panel.

## Source-of-truth hierarchy

```text
src/content/events/<year>/<slug>.md   canonical event records
                ↓
Astro events content collection
                ↓
README.md (upcoming) + EVENTS.md (full archive)
                ↓
Astro site (secondary map/search/filter view)
```

The Markdown files are the records maintainers review and edit. `README.md` is intentionally upcoming-only. `EVENTS.md` is the complete generated archive, including past events. Do not edit either generated list by hand.

## Contribution flow

```text
GitHub event issue form or pull request
                ↓
official HTTP(S) URL, date/location/type and duplicate review
                ↓
canonical Markdown event file under src/content/events/
                ↓
generate README.md and EVENTS.md
                ↓
list check + pytest + Astro build
                ↓
GitHub Pages deployment (main only)
```

Community members should normally use the issue forms. A maintainer turns an accepted submission into a Markdown record after checking the organizer's official page, dates, location, event type, and duplicate status. Technical contributors may add or update one Markdown file and open a focused pull request. New contributor records need an official HTTP(S) URL; only migrated records with a `maintainer` block may preserve a null or unknown URL.

## Repository map

```text
awesome-bitcoin-events/
├── src/content/events/              # canonical one-file-per-event Markdown records
├── src/content.config.ts            # Astro content collection and frontmatter contract
├── scripts/build_event_lists.mjs    # README/EVENTS generator and freshness check
├── README.md                        # generated upcoming list plus project guidance
├── EVENTS.md                        # generated full archive
├── data/
│   ├── sources.json                 # supporting source directory/history
│   ├── geo-cache.json               # supporting public geocoding cache
│   ├── events.json                  # migrated data/reference snapshot, not canonical
│   ├── README.md                    # supporting-data notes
│   └── schema/                      # historical JSON dataset schema/reference
├── sources/raw/                     # immutable public research snapshots
├── src/pages/                       # Astro home and generated event detail routes
├── src/components/                  # reusable Astro components
├── src/lib/                         # content adapters and display helpers
├── .github/ISSUE_TEMPLATE/          # event submission and correction forms
├── .github/workflows/pages.yml      # PR validation and main/manual Pages deploy
├── CONTRIBUTING.md                  # contributor-facing field and review rules
├── PLAN.md                          # roadmap
└── HANDOFF.md                       # current operational truth
```

`data/sources.json` and `data/geo-cache.json` support provenance and map rendering during migration; they are not the event-record source of truth. `data/events.json` is retained as a migrated reference snapshot for audit and migration work. Do not add new canonical events there.

## Generated list commands

Run these from the repository root:

```bash
npm install
npm run generate:event-lists
npm run check:event-lists
```

Normal generation uses the current UTC date and writes a named `EVENTS:GENERATED-AS-OF` marker into both generated files. The no-argument check reads that committed marker, so a tree does not become stale merely because the calendar moved forward. Use `--today YYYY-MM-DD` when deliberately regenerating or checking against a specific date:

```bash
node scripts/build_event_lists.mjs --today 2026-09-22
node scripts/build_event_lists.mjs --check --today 2026-09-22
```

The generator reads event Markdown through the frontmatter contract, validates official HTTP(S) URLs, escapes user-controlled table fields, and preserves the hand-written text outside the README upcoming markers.

## Data and evidence principles

- A source is evidence, not truth.
- Unknown values are `null`, never guesses.
- Official URLs and discovery/source URLs remain distinct.
- Date conflicts remain visible as `needs_review`.
- Venue coordinates are more precise than city-centre coordinates.
- Generated `dist/` output is local build output and is not committed.

## Maintainer checklist

For every accepted event:

- [ ] official HTTP(S) page checked;
- [ ] duplicate search completed;
- [ ] dates and timezone recorded;
- [ ] city/country and map precision recorded;
- [ ] source observation and raw evidence retained;
- [ ] one canonical Markdown file added or updated;
- [ ] `npm run generate:event-lists` run;
- [ ] `npm run check:event-lists` passes;
- [ ] `python -m pytest -q` passes;
- [ ] `npm run build` passes;
- [ ] live GitHub Pages route checked after a main-branch deployment.

## Public boundary

This repository is public. Do not put credentials, private contact databases, logged-in browser state, internal notes, or private source exports in issues, commits, or raw snapshots. A file outside the generated site is still public if it is committed here.
