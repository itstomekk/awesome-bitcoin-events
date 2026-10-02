# Handoff

Updated: 2026-10-01. Agents: read this file first. The workflow skill is in `.claude/skills/add-bitcoin-event/SKILL.md`.

## Current truth

- **README.md is the source of truth.** Upcoming events live in **one table per year** under `## Year`, with columns `| Date | Event | Location | Type |`. There are no month headings: the month lives in the Date cell, and `npm run check` rejects any `### <Month>` line with a migration hint. `PAST.md` is the archive in the same format, newest year first. `TO-VERIFY.md` holds leads without an official page; they are not on the site.
- **Website** (https://itstomekk.github.io/awesome-bitcoin-events/) is Astro. It is generated from README.md + PAST.md by `src/lib/awesome-list.js`, the single parser. Map pins come from `data/places.json`. Upcoming/past status is computed in the browser. The design is an "almanac" index; all design values are tokens in `src/styles/tokens.css`.
- **Commands:** `npm run check` (validate), `npm test`, `npm run archive` (move ended events to PAST.md), `npm run dev`.
- **CI** (`.github/workflows/pages.yml`): check, test, awesome-lint (only content rules fail; the GitHub-settings rule warns), build, and deploy on main. `links.yml` runs a weekly link check that opens an issue.
- The README carries `<!--lint disable table-pipe-alignment-->` so contributors don't have to pad table pipes. awesome-lint otherwise passes; its one expected warning is about "bitcoin++".
- Counts on 2026-10-01, after the year-only migration and the lead re-check: 49 upcoming, 154 past, 3 to verify (203 listed), 146 meetups. `npm run check` confirmed these counts.
- **Meetups** live in `MEETUPS.md` (one table per region: `| City, Country | [Name](link) | About |`). The site shows them twice: as a tab on the home page and on its own page at `/meetups` (both render `src/components/MeetupList.astro`), with blue map pins. The first batch is 45 BitDevs chapters (bitdevs.org/cities) plus 101 Meetup.com groups from BTC Map's community directory (`api.btcmap.org/v2/areas`), cleaned by hand (wrong or shared links dropped, place names fixed).
- **Event details:** clicking a row expands it to show the full dates with weekday, a countdown, add-to-calendar (.ics / Google), show on map, copy link (`#event-id` deep links) and report-a-correction. Optional descriptions and images come from `data/details.json`, keyed by official URL and filled by `npm run enrich` (the organizer's og:description / og:image). Always review the result; hand-fixed entries use `"source": "manual"`.
- 2026-09-28 corrections: LABITCONF 2026 is Oct 30–31 (Oct 29 is only a B2B/opening day). Bitcoin MENA has no 2026 edition: the 2025 edition (Dec 8–9, 2025) was added to PAST.md, and Bitcoin MENA 2027 (confirmed by the owner, "late 2027" at ADNEC Abu Dhabi, exact dates not announced) waits in TO-VERIFY until dates are published.

## History worth knowing

- 2026-09-30: local `main` aligned to `origin/main` after preserving the previous conflicted working tree in `C:\Users\Lenovo\Hermes\_archive\2026-09-30-awesome-bitcoin-events-pre-main-sync\` and retaining the previous commit as `backup/pre-canonical-main-20260930`. Three local-only discoveries without official event pages were added to `TO-VERIFY.md`; see `docs/ORGANIZATION-LOG.md`.

- 2026-10-01: README.md and PAST.md moved to one table per year (month headings dropped; the parser now rejects them with a hint so they can't come back). Archived Bitcoin Treasuries Conference 2026. Re-checked every TO-VERIFY lead: **Bitcoin Japan 2026** (Nov 27–28, Tokyo, btc-jpn.com) and **AI Startup Rodeo 2026** (Oct 30, Austin) promoted on organizer evidence; **Canadian Bitcoin Conference 2026** and **Golden Gate Bitcoin Conference** dropped after both organizers cancelled them; Bitcoin: A Competitive Advantage, Bitcoin MENA 2027 and Origin Seoul 2027 left as leads. Added a `/meetups` page and a document link strip at the top of the README.

- v3 rebuild (PR #4): removed the per-event YAML, the Python pipeline and the old datasets. Last commit containing them: `2eeb4b9`.
- 2026-09-28: recovered 42 events from the March 2026 README (commit `0b6c616`) that the earlier migration had missed. They were added to PAST.md with the dates listed in March; most sites no longer show those dates, so treat them as the owner's curation.
  - Skipped as stale: Bitkiwi XV and Bitcoin Burgenland (their links point to 2025 pages), and the Dallas Muslim Bitcoin Summit row.
- Muslim Bitcoin Summit 2026 (Oct 10–11, London) was confirmed on mslmbtcsummit.com and promoted to the README.
- Research files (`sources/`: source registry, scans, Notion source inventory) were removed from the repo at the owner's request. The useful calendars are listed in .github/CONTRIBUTING.md under "Where to find events". Recover the files from commit `6de0515` if needed.
- Notion "Best Bitcoin Events 2026" (under Bitcoin Film Fest / Nomishka tasks) holds articles about events (Forbes, Braiins, bitbo…), not event rows. It is useful for research only.

- 2026-09-28 (second pass): full comparison with bitcoinonly.events. Each event page there has schema.org JSON-LD with dates and the official link in `offers.url`, reachable via `/wp-json/wp/v2/posts?categories=16`. Added 18 upcoming events (each confirmed on its official page) and 37 past 2026 events; 5 unconfirmed leads went to TO-VERIFY. Deliberately skipped: small meetups and side events, AI-focused events, and entries duplicating ones already listed. The Sovereign Summit is at the Fontainebleau hotel in **Miami Beach**, not France.
- The unmerged branch `claude/add-bitcoin-events-BIzxh` was checked; its 3 extra events are now included.

## How to work here

Follow `.claude/skills/add-bitcoin-event/SKILL.md`. Before pushing, run `npm run check && npm test && npm run build`.

## Next actions

1. Verify the 3 remaining TO-VERIFY.md leads: Bitcoin MENA 2027 dates (`mena.b.tc/event-update`), Origin Seoul 2027 (the organizer site still advertises the 2026 edition), and Bitcoin: A Competitive Advantage (the official page shows only the 2025 Derby edition, and sources disagree on the city).
2. Add more verified upcoming events (target 50+) using the sources in .github/CONTRIBUTING.md.
3. Run `npm run archive` monthly.
4. Improve technical SEO and social sharing metadata; see `PLAN.md`. Canonical + `og:url` + `twitter:card` are now emitted by `src/layouts/BaseLayout.astro` for both pages; still missing: sitemap, `robots.txt`, and an `og:image` share card.
5. Do not submit this list to sindresorhus/awesome: its current contribution requirements explicitly exclude blockchain-related lists.
