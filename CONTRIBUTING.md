# Contributing to Awesome Bitcoin Events

Awesome Bitcoin Events is a community-maintained directory. Anyone can suggest an event or report a correction; maintainers review the public evidence before updating the canonical records.

## No-code path: use a GitHub issue form

The **[event submission form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)** is the easiest route. Submit one event per issue and include the organizer's official page, dates, location, event type, and a short note about what the source confirms. Use the **[correction form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-correction.yml)** for changes to an existing listing.

Maintainers check the source, dates, duplicate status, and whether the event is relevant to Bitcoin before adding or changing a record. A submission is not published automatically.

## Canonical Markdown records

Dated event records live in `src/content/events/<year>/<slug>.md`. Each file is Markdown with YAML frontmatter. The public contributor fields are deliberately small:

```yaml
title: Community Meetup
start: '2026-09-22'
end: '2026-09-22'
location: Online
url: https://example.org/meetup
format: meetup
```

Use inclusive `YYYY-MM-DD` dates. `end` may equal `start`, but must not be earlier. New contributor records require an official HTTP(S) `url`; do not submit a null, unknown, directory, or search-result URL. Only migrated records with a maintainer-owned `maintainer` block may retain a null or unknown URL while their historical evidence is reviewed.

Use exactly one of these location forms:

- `Online`
- `City, Country`
- `Venue, City, Country`

Do not add a region, state, or extra comma-separated component to a contributor location. If the venue is unknown, use `City, Country`. Use the organizer's own spelling for names and locations.

The `maintainer` frontmatter block is reserved for maintainers. It contains source evidence, verification state, coordinates, legacy data, and other enriched metadata; contributors should not add or edit those fields in a normal event submission.

## Generated lists

`README.md` contains a generated upcoming table between stable markers. `EVENTS.md` is the generated full archive with upcoming events first and past events grouped by year. Do not edit those generated sections by hand. Run:

```bash
npm install
npm run generate:event-lists
npm run check:event-lists
```

The check command fails when either generated file is stale. GitHub Actions runs the same freshness check before building the site.

## Pull requests

For a technical contribution, add or edit one event Markdown file, run the generator and checks, then open a focused pull request. Do not edit `dist/`, commit private notes or credentials, or change maintainer evidence unless a maintainer asks you to do so.

Before opening a pull request:

```bash
npm run generate:event-lists
npm run check:event-lists
npm run build
python -m pytest -q
git diff --check
```

The generated Astro website is a secondary map/search/filter view. The Markdown event files and their review history are the source contributors should update.

## Evidence and corrections

Use public organizer pages whenever possible. Directory pages and community calendars can be useful supporting evidence but should not be presented as an official event URL. If a date, venue, ticket page, or event status changes, open a correction issue rather than silently replacing evidence.
