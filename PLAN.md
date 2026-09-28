# Plan

## Goal

A classic awesome list of Bitcoin events, where **README.md is the single source of truth** and every listed event links to its organizer. The website (search, filters, map) is generated from the README and never edited separately.

## Done (v3.0.0, 2026-09-28)

- [x] README.md is canonical: upcoming events by year and month, in awesome-list style (badge, contents, one line per event).
- [x] PAST.md archive in the same format; TO-VERIFY.md holds leads that have no official page yet.
- [x] One parser (`src/lib/awesome-list.js`) shared by the website, the validator and the archive helper.
- [x] CI on every PR: list validation with line-numbered errors, parser tests, `awesome-lint`, site build.
- [x] Upcoming vs past decided in the browser, so the site never goes stale between deploys.
- [x] Weekly link check that opens an issue for broken official links.
- [x] CC0-1.0 licence.

## Next

- [ ] Verify the 19 events in TO-VERIFY.md and promote the ones with an official page.
- [ ] Grow the upcoming list (target: 50+ verified upcoming events), using `sources/` as the research starting point.
- [ ] Switch the 6 `http://` links to `https://` where the sites support it.
- [ ] Optional: submit to [sindresorhus/awesome](https://github.com/sindresorhus/awesome). It requires the repo to be 30+ days old and to follow their PR checklist.
- [ ] Optional: a recurring-meetups section (BitDevs, Bitcoin meetups by city), which would need an undated line format.
