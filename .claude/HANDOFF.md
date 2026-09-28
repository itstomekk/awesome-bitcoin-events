# Handoff

Updated: 2026-09-28. Kept in `.claude/` so the repo root stays clean for contributors.

## Current truth

- **README.md is the source of truth.** Upcoming events live in one table per month under `## Year` / `### Month`, with columns `| Date | Event | Location | Type |`. `PAST.md` is the archive in the same format, newest year first. `TO-VERIFY.md` holds leads without an official page; they are not on the site.
- **Website** (https://itstomekk.github.io/awesome-bitcoin-events/) is Astro. It is generated from README.md + PAST.md by `src/lib/awesome-list.js`, the single parser. Map pins come from `data/places.json`. Upcoming/past status is computed in the browser. The design is an "almanac" index; all design values are tokens in `src/styles/tokens.css`.
- **Commands:** `npm run check` (validate), `npm test`, `npm run archive` (move ended events to PAST.md), `npm run dev`.
- **CI** (`.github/workflows/pages.yml`): check, test, awesome-lint (only content rules fail; the GitHub-settings rule warns), build, and deploy on main. `links.yml` runs a weekly link check that opens an issue.
- The README carries `<!--lint disable table-pipe-alignment-->` so contributors don't have to pad table pipes. awesome-lint otherwise passes; its one expected warning is about "bitcoin++".
- Counts on 2026-09-28: 39 upcoming, 150 past, 16 to verify (189 listed), 146 meetups.
- **Meetups** live in `MEETUPS.md` (one table per region: `| City, Country | [Name](link) | About |`), shown on the site under a Meetups tab with blue map pins. The first batch is 45 BitDevs chapters (bitdevs.org/cities) plus 101 Meetup.com groups from BTC Map's community directory (`api.btcmap.org/v2/areas`), cleaned by hand (wrong or shared links dropped, place names fixed).
- **Event details:** clicking a row expands it to show the full dates with weekday, a countdown, add-to-calendar (.ics / Google), show on map, copy link (`#event-id` deep links) and report-a-correction. Optional descriptions and images come from `data/details.json`, keyed by official URL and filled by `npm run enrich` (the organizer's og:description / og:image). Always review the result; hand-fixed entries use `"source": "manual"`.
- 2026-09-28 corrections: LABITCONF 2026 is Oct 30–31 (Oct 29 is only a B2B/opening day). Bitcoin MENA 2026 moved to TO-VERIFY because mena.b.tc now only sells 2027 tickets.

## History worth knowing

- v3 rebuild (PR #4): removed the per-event YAML, the Python pipeline and the old datasets. Last commit containing them: `2eeb4b9`.
- 2026-09-28: recovered 42 events from the March 2026 README (commit `0b6c616`) that the earlier migration had missed. They were added to PAST.md with the dates listed in March; most sites no longer show those dates, so treat them as the owner's curation.
  - Skipped as stale: Bitkiwi XV and Bitcoin Burgenland (their links point to 2025 pages), and the Dallas Muslim Bitcoin Summit row.
- Muslim Bitcoin Summit 2026 (Oct 10–11, London) was confirmed on mslmbtcsummit.com and promoted to the README.
- Research files (`sources/`: source registry, scans, Notion source inventory) were removed from the repo at the owner's request. The useful calendars are listed in CONTRIBUTING.md under "Where to find events". Recover the files from commit `6de0515` if needed.
- Notion "Best Bitcoin Events 2026" (under Bitcoin Film Fest / Nomishka tasks) holds articles about events (Forbes, Braiins, bitbo…), not event rows. It is useful for research only.

- 2026-09-28 (second pass): full comparison with bitcoinonly.events. Each event page there has schema.org JSON-LD with dates and the official link in `offers.url`, reachable via `/wp-json/wp/v2/posts?categories=16`. Added 18 upcoming events (each confirmed on its official page) and 37 past 2026 events; 5 unconfirmed leads went to TO-VERIFY. Deliberately skipped: small meetups and side events, AI-focused events, and entries duplicating ones already listed. The Sovereign Summit is at the Fontainebleau hotel in **Miami Beach**, not France.
- The unmerged branch `claude/add-bitcoin-events-BIzxh` was checked; its 3 extra events are now included.

## How to work here

Follow `.claude/skills/add-bitcoin-event/SKILL.md`. Before pushing, run `npm run check && npm test && npm run build`.

## Next actions

1. Verify the 15 TO-VERIFY.md leads against organizer pages; promote the confirmed ones.
2. Add more verified upcoming events (target 50+) using the sources in CONTRIBUTING.md.
3. Run `npm run archive` monthly.
4. The owner still needs to add the `awesome` GitHub topic. After that, submit to sindresorhus/awesome.
