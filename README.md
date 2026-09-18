# Awesome Bitcoin Events

Awesome Bitcoin Events is a community repository of Bitcoin conferences, meetups, retreats, and related gatherings. It turns the normalized records in `data/events.json` into a fast GitHub Pages site with a browseable calendar, map, and one generated detail page per event.

## Build stack

- **Astro 5** generates static HTML at build time. There is no server and no runtime database.
- **Leaflet** renders the event map with OpenStreetMap tiles. `data/geo-cache.json` preserves the public geocoding cache and attribution; points are labeled as venue or city-centre approximations.
- A small browser script in `src/pages/index.astro` adds search, filtering, and map popups after the HTML loads. The site still contains the full upcoming listing without JavaScript.
- `.github/workflows/pages.yml` builds with Node 20 and deploys `dist/` through GitHub Pages Actions.

## Run it locally

```bash
npm install
npm run dev
```

Open the local URL printed by Astro. For a production build:

```bash
npm run build
npm run preview
```

The build creates `dist/`; it is generated output and is intentionally ignored by Git.

## Where to edit

| Need | Edit |
|---|---|
| Add or correct event records | `data/events.json` through the documented ingestion/review workflow |
| Add or review source records | `data/sources.json` and the evidence under `sources/` |
| Change the data contract | `data/schema/event-dataset.schema.json` and `data/README.md` |
| Change the home page structure or filters | `src/pages/index.astro` |
| Change an event detail page | `src/pages/events/[id].astro` |
| Change card markup | `src/components/EventCard.astro` |
| Change shared header/footer/meta | `src/layouts/BaseLayout.astro` |
| Change colors, type, spacing, responsive behavior | `src/styles/global.css` |
| Change the GitHub Pages build | `.github/workflows/pages.yml` and `astro.config.mjs` |
| Understand the current data/release state | `HANDOFF.md`, `PLAN.md`, `BUILD-LOG.md` |

Event pages are generated from the stable event ID, so adding a record automatically creates a route under `events/<id>/` on the next build. The UI deliberately labels `official_page_seen`, `discovery_only`, `legacy_imported`, and `needs_review` records differently; discovery evidence is not presented as organizer confirmation.

## Data boundary

`data/events.json` and `data/sources.json` are the public, versioned inputs to the site. Anything committed to this repository is visible to anyone with repository access, even if it is outside `dist/`. Do not commit credentials, browser state, private contact lists, raw private exports, or secrets. Raw source snapshots are kept only when they are suitable for the repository's intended visibility.

The canonical data layer is separate from the old root-level `events.json`, `index.html`, `app.js`, and `style.css`. Those files are retained as the legacy editor/frontend reference while the Astro site is the GitHub Pages build target.

## GitHub Pages

The workflow expects the repository project URL:

`https://itstomekk.github.io/awesome-bitcoin-events/`

It passes `PUBLIC_BASE_PATH=/awesome-bitcoin-events` so asset and detail links work when the site is served below the repository name. For a custom domain, set the production base path and Pages domain intentionally; do not add a `CNAME` or change DNS as part of a normal content update.
