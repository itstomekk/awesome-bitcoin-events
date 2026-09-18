# Contributing to Awesome Bitcoin Events

Awesome Bitcoin Events is a community repository. Anyone can suggest an event or report a correction; maintainers review submissions before they become part of the public dataset.

## The easiest way: use a form

1. Open the [New event submission form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml).
2. Submit one event per issue.
3. Provide the organizer-owned event page and the dates/location it confirms.
4. A maintainer checks the evidence, resolves duplicates, and updates the canonical JSON data.
5. GitHub Actions rebuilds the site and publishes the detail page automatically.

For changes to an existing record, use the [event correction form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-correction.yml).

## What makes a useful submission?

Please include:

- a public official event URL;
- the event name and year;
- start and end dates in `YYYY-MM-DD` format;
- city and country, or `Online`;
- venue when the organizer publishes it;
- a registration/ticket URL when one exists;
- a short explanation of what the official page confirms.

Do not submit a directory page as the official URL. You may include directories or community calendars as supporting evidence, but the repository keeps those separate from organizer confirmation.

## How review works

A submission is not published automatically. Maintainers:

1. check that the URL is public and relevant to Bitcoin;
2. compare the event with existing titles, dates, locations, and official URLs;
3. preserve the source observation and research snapshot;
4. mark the record with a verification state;
5. add the record to `data/events.json` only when the evidence is suitable;
6. run the tests and build before merging.

The site distinguishes:

| State | Meaning |
|---|---|
| `official_page_seen` | An organizer-owned or organizer-confirmed page was checked. |
| `discovery_only` | The event is a useful lead, but organizer confirmation is missing. |
| `needs_review` | Evidence conflicts or an important field is unresolved. |
| `legacy_imported` | Preserved from the old dataset and not yet re-confirmed. |

A record can appear in the calendar without being an endorsement. The confidence label tells readers how much evidence is currently available.

## Map data

The site adds a map point when the record has usable coordinates. Venue points are preferred; otherwise a city-centre approximation is stored with `coordinates_precision: "city_centroid"`. Online events do not receive a geographic point. Map coordinates are cached in `data/geo-cache.json` with OpenStreetMap attribution.

## For code and data contributors

Do not edit generated `dist/` output. For a source change:

```bash
npm install
npm run build
python -m pytest -q
```

Then inspect `git diff --check`, open a focused pull request, and explain the source evidence. Keep private notes, passwords, browser state, private email lists, and unpublished exports out of the repository. Every committed file is public in a public repository.

## Questions and conduct

Be specific, respectful, and evidence-led. Do not use issues to publish personal information, harassment, ticket scams, or promotional spam. If a submission is incomplete, maintainers may ask for a public source or leave it in review rather than guessing.
