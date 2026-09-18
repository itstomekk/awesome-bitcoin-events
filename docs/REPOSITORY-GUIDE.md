# Repository guide

## Purpose

Awesome Bitcoin Events is a community-maintained, source-aware directory of Bitcoin events. The public site is a generated view of versioned JSON data; it is not backed by a live database or a private admin panel.

## Contribution flow

```text
GitHub issue form
      ↓
source and duplicate review
      ↓
canonical data/events.json + source evidence
      ↓
Astro build
      ↓
GitHub Pages
```

Community members should use the issue forms rather than editing JSON directly. This keeps provenance, duplicate handling, uncertainty, and map precision consistent.

## Repository map

```text
awesome-bitcoin-events/
├── data/
│   ├── events.json              # canonical normalized event records
│   ├── sources.json             # source directory and monitoring decisions
│   ├── geo-cache.json           # public geocoding cache and OSM attribution
│   └── schema/                  # JSON Schema for the event dataset
├── sources/raw/                 # immutable public research snapshots
├── src/
│   ├── pages/index.astro        # home, filters, map, and community surface
│   ├── pages/events/[id].astro  # generated detail route per event
│   ├── components/             # reusable card markup
│   ├── layouts/                # shared metadata, header, footer
│   └── styles/                 # visual system and responsive layout
├── .github/
│   ├── ISSUE_TEMPLATE/          # event submission and correction forms
│   └── workflows/pages.yml      # build and deploy workflow
├── CONTRIBUTING.md              # contributor-facing review guide
├── PLAN.md                      # roadmap and current phase
└── HANDOFF.md                   # current operational truth
```

## Data principles

- A source is evidence, not truth.
- Unknown values are `null`, not guesses.
- Official URLs and discovery URLs are kept separate.
- Date conflicts remain visible as `needs_review`.
- Venue coordinates are more precise than city-centre coordinates.
- Generated output belongs in `dist/` locally and is not committed.

## Maintainer checklist

For every accepted event:

- [ ] official page checked or record intentionally labeled `discovery_only`;
- [ ] duplicate search completed;
- [ ] dates and timezone recorded;
- [ ] city/country and map precision recorded;
- [ ] source observation and raw evidence retained;
- [ ] `data/events.json` and `data/sources.json` totals updated;
- [ ] `python -m pytest -q` passes;
- [ ] `npm run build` passes;
- [ ] live GitHub Pages route checked after deployment.

## Public boundary

This repository is public. Do not put credentials, private contact databases, logged-in browser state, internal notes, or private source exports in issues, commits, or raw snapshots. A file outside the generated site is still public if it is committed here.
