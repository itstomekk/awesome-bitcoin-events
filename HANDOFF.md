# Handoff

Updated: 2026-09-28

## Current truth (v3.0.0)

- **README.md is the source of truth.** It holds upcoming events, one line each, grouped by `## Year` / `### Month`, in awesome-list style. `PAST.md` is the archive (same format). `TO-VERIFY.md` holds leads without an official page, which are neither in the list nor on the site.
- **Website** (https://itstomekk.github.io/awesome-bitcoin-events/) is Astro, built from README.md + PAST.md via `src/lib/awesome-list.js` (the single parser). Map pins come from `data/places.json` ("City, Country" → [lat, lon]). Upcoming/past is computed in the browser.
- **CI** (`.github/workflows/pages.yml`): `npm run check`, `npm test`, `awesome-lint`, build; deploys on push to main. `links.yml` runs a weekly link check that opens an issue.
- Counts on 2026-09-28: 21 upcoming (README), 69 past (PAST.md), 19 to verify.
- The old system (109 YAML event files, generator, Python pipeline, detail pages) was removed in the v3 rebuild. It lives in git history at commit `2eeb4b9`.
- `sources/` is research material only (source registry, raw scans).

## How to work here

Follow `.claude/skills/add-bitcoin-event/SKILL.md`. Checks: `npm run check && npm test && npm run build`.

## Next actions

1. Verify the 19 TO-VERIFY.md leads against organizer pages; promote the confirmed ones.
2. Add more verified upcoming events (target 50+).
3. Run `npm run archive` monthly.
4. Later: submit to sindresorhus/awesome.
