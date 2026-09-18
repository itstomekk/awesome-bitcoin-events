# Awesome Bitcoin Events

[![Deploy to GitHub Pages](https://github.com/itstomekk/awesome-bitcoin-events/actions/workflows/pages.yml/badge.svg)](https://github.com/itstomekk/awesome-bitcoin-events/actions/workflows/pages.yml)
[![Live calendar](https://img.shields.io/badge/live-calendar-f7931a?logo=bitcoin&logoColor=111111)](https://itstomekk.github.io/awesome-bitcoin-events/)
[![Community submissions](https://img.shields.io/badge/contributions-welcome-2f6f62)](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)

**A community repository of Bitcoin events around the world.**

Browse conferences, meetups, retreats, festivals, and technical gatherings in one source-aware calendar. Every record keeps its evidence and verification state visible instead of presenting uncertain listings as confirmed facts.

## Explore the live calendar

https://itstomekk.github.io/awesome-bitcoin-events/

The site includes:

- upcoming-first calendar browsing;
- search and filters for year, region, format, and verification state;
- an interactive Leaflet/OpenStreetMap map with 108 plotted records;
- one detail page per event;
- source and confidence labels for official, discovery, legacy, and review records;
- responsive layout for desktop and mobile.

> This is a community directory, not an endorsement of every event. Check the verification label and the organizer's page before making travel or ticket decisions.

## Add an event in under two minutes

You do not need to edit JSON or open a pull request.

1. Open the **[Submit an event form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)**.
2. Submit one event per issue.
3. Include the organizer-owned event page, dates, location, and a short evidence note.
4. A maintainer checks the source, duplicate status, dates, and map location.
5. Approved records are added to the canonical dataset and published by GitHub Actions.

Found a change, cancellation, duplicate, or wrong date? Use the **[event correction form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-correction.yml)**.

Read the full workflow in [`CONTRIBUTING.md`](CONTRIBUTING.md) or the maintainer-oriented [`docs/REPOSITORY-GUIDE.md`](docs/REPOSITORY-GUIDE.md).

## How the data works

The repository has a simple separation of responsibilities:

```text
community issue form
        ↓
source and duplicate review
        ↓
canonical JSON + source evidence
        ↓
Astro static build
        ↓
GitHub Pages
```

A source is evidence, not truth. The public UI distinguishes these states:

| Verification state | Meaning |
|---|---|
| `official_page_seen` | An organizer-owned or organizer-confirmed page was checked. |
| `discovery_only` | A useful event lead exists, but organizer confirmation is missing. |
| `needs_review` | Sources conflict or an important field is unresolved. |
| `legacy_imported` | Preserved from the older dataset and not yet re-confirmed. |

Unknown values remain `null`. Dates are not guessed. Directory pages and community calendars are retained as observations, not silently promoted to official sources.

## Repository map

| Area | Responsibility |
|---|---|
| `data/events.json` | Canonical normalized event records consumed by the site. |
| `data/sources.json` | Source directory, roles, quality, and monitoring decisions. |
| `data/geo-cache.json` | Public OpenStreetMap Nominatim geocoding cache and attribution. |
| `data/schema/` | JSON Schema for the event dataset. |
| `sources/raw/` | Immutable public research snapshots. |
| `src/pages/index.astro` | Home page, filters, map, and community-facing content. |
| `src/pages/events/[id].astro` | Generated evidence/detail route for each event. |
| `src/components/` | Shared event card markup. |
| `src/layouts/` | Shared document metadata, header, footer, and navigation. |
| `src/styles/` | Visual system, responsive layout, focus states, and map presentation. |
| `.github/ISSUE_TEMPLATE/` | Public event submission and correction forms. |
| `.github/workflows/pages.yml` | Astro build and GitHub Pages deployment. |

## Run it locally

Requirements: Node.js 18+ and Python 3 for the existing data tests.

```bash
npm install
npm run dev
```

For a production build and local preview:

```bash
npm run build
npm run preview
```

The generated `dist/` directory is ignored by Git. The site is static: there is no server, cPanel database, or runtime API.

Before opening a code or data pull request:

```bash
npm run build
python -m pytest -q
git diff --check
```

## Data and privacy boundary

This is a public repository. Every committed file is visible to repository visitors, even when it is outside the generated site. Never commit passwords, API keys, browser sessions, private contact lists, private exports, or unpublished internal notes. Do not put private email addresses in event issues; use public organizer pages or public contact channels.

The old root-level `events.json`, `index.html`, `app.js`, and `style.css` are retained as legacy reference files. The Astro site and the versioned `data/` layer are the current public build path.

## Deployment

A push to `main` runs `.github/workflows/pages.yml`. The workflow builds with Astro, uploads `dist/`, and deploys through GitHub Pages Actions.

Repository Pages URL:

https://itstomekk.github.io/awesome-bitcoin-events/

## Project documents

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contributor workflow and review rules.
- [`docs/REPOSITORY-GUIDE.md`](docs/REPOSITORY-GUIDE.md) — architecture and maintainer checklist.
- [`data/README.md`](data/README.md) — data contract and record rules.
- [`PLAN.md`](PLAN.md) — roadmap and current phase.
- [`HANDOFF.md`](HANDOFF.md) — current verified state.
- [`BUILD-LOG.md`](BUILD-LOG.md) — build and deployment evidence.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — community standards.
