---
name: add-bitcoin-event
description: Add, verify, correct or archive events in the awesome-bitcoin-events list (README.md is the source of truth). Use when asked to add an event, promote something from TO-VERIFY.md, fix a date, or tidy up ended events.
---

# Add or maintain events

Project state and history: `HANDOFF.md` in the repo root.

README.md is the only source of truth. Never edit the website or generated files; there are none.

## Add an event

1. Confirm it on the **organizer's own page** (dates, city). If there's no official page, add a row to `TO-VERIFY.md` instead and stop.
2. Add one table row under `## <year>` in README.md, in start-date order:
   `| Oct 12–15 | [Name](https://official-url) | City, Country | Conference |`
   One table per year. Do not add month headings - the month lives in the Date column, and `npm run check` rejects `### Month` lines. A new year needs the heading plus `| Date | Event | Location | Type |` and `| --- | --- | --- | --- |`.
   Types: Conference, Meetup, Festival, Retreat, Unconference, Hackathon, Workshop.
   Missing year heading? Add it, and add the year to `## Contents`.
3. If `City, Country` is new, add `"City, Country": [lat, lon]` to `data/places.json` (OpenStreetMap coordinates, 5 decimals).
4. Run `npm run check && npm test`. Errors name the file and line.
5. When promoting from TO-VERIFY.md, delete its row in the same commit.

## Meetups and details

- Recurring meetups go in the `## Meetups` section of README.md, as `### <Region>` tables (one table per region, `| City, Country | [Name](link) | About |`). Sources used so far: BitDevs city list, BTC Map community directory (`api.btcmap.org/v2/areas`, tags `contact:meetup`), and the NIP-52 calendars behind Plektos and Satlantis; bitcoinonly.events meetup pages have no outbound links.
- `npm run enrich` fills `data/details.json` for upcoming events; in this sandbox run it with `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. Always review: some og:descriptions are ticket text or last year's blurb. Fix them by hand with `"source": "manual"`.

## Housekeeping

- `npm run archive` moves ended events from README.md to PAST.md. Review the diff and commit it.
- `npm run check` warnings (http links, missing map points) are non-blocking to-dos.

## Gotchas learned

- The web sandbox can't load external HTTPS in headless Chromium (proxy CA). For visual QA, serve `dist/` via Playwright `route()` rather than `astro preview`.
- `awesome-lint` warns on "bitcoin++" (the event's real name); that warning is expected and doesn't fail CI.
