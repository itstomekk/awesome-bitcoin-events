# Changelog

## 3.1.0 — 2026-09-28

- Website redesign: a light "almanac" index with a newspaper-style masthead, sticky month labels, one row per event (dates · name · place · type), a "Next" flag on the next event, a greyscale map and a colophon footer. Every colour, font and spacing value is a token in `src/styles/tokens.css`.

## 3.0.0 — 2026-09-28

README.md is now the source of truth.

- Rebuilt as an awesome list: `README.md` lists upcoming events (one line each, grouped by year and month), `PAST.md` is the archive and `TO-VERIFY.md` holds leads without an official page.
- The website is generated from README.md + PAST.md by a single parser (`src/lib/awesome-list.js`). The build fails on a malformed line. Upcoming/past is computed in the visitor's browser.
- New commands: `npm run check` (validate the list), `npm test`, `npm run archive` (move ended events to PAST.md).
- CI runs the validator, the tests, `awesome-lint` and the build on every PR. A weekly link check opens an issue for broken links.
- Removed the per-event YAML files, the README generator, the JSON dataset, the Python migration/import scripts, the per-event detail pages and the v1 legacy frontend. Git history keeps all of them (last version: commit 2eeb4b9).
- Added the CC0-1.0 licence. Leaflet now loads only on the home page, with integrity hashes.
- Data: 11 missing countries filled in; Bitcoin FilmFest 2027 confirmed on its official site; country names normalised (USA, UK).

## 2026-09-18

- Added the verified LABITCONF 2026 record and source evidence.
- Added the Awesome Bitcoin Events map with 108 plotted records and OpenStreetMap attribution.
- Researched and refreshed the next five uploaded events; kept Copa Bitcoin visibly under review because its date evidence conflicts.
- Published the updated community repository through GitHub Pages Actions.
- Added GitHub issue forms for event submissions and corrections, plus contributor, repository, and conduct documentation.

## 2026-09-16

- Introduced the Astro-based Signal Atlas GitHub Pages frontend.
- Added generated event detail pages, source-confidence labels, responsive filters, and a GitHub Pages Actions deployment workflow.
