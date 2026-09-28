# Contributing

Thanks for helping keep Awesome Bitcoin Events useful. The whole list lives in **[README.md](README.md)**. That file is the source of truth, and the [website](https://itstomekk.github.io/awesome-bitcoin-events/) is built from it automatically.

## Add an event (2 minutes, no tools needed)

1. Open [README.md](README.md) on GitHub and click the ✏️ pencil icon.
2. Find the right `## Year` and `### Month` heading (or add them), and add one line in date order:

   ```markdown
   - [Event name](https://official-event-page) - Oct 12–15 · City, Country · Conference.
   ```

3. Click **Propose changes**, then **Create pull request**. An automatic check tells you, with the line number, if something is off.

Don't want to edit Markdown? Use the **[event submission form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)** and a maintainer will add the line.

## The line format

```
- [Name](https://official-url) - Dates · Location · Type. Optional short note.
```

| Part | Rules | Examples |
| --- | --- | --- |
| Name | The event's public name | `TABConf 8`, `Bitcoin Amsterdam 2026` |
| Link | The **organizer's own page** (https). Aggregators, ticket resellers and social posts don't count. | `https://tabconf.com/` |
| Dates | 3-letter month plus day, using the year from the heading. Use an en dash `–` or a hyphen `-` for ranges. | `Oct 24` · `Oct 12–15` · `Oct 29 – Nov 1` |
| Location | `City, Country`, just the country, or `Online` | `Atlanta, USA` · `Hong Kong` · `Online` |
| Type | One of: Conference, Meetup, Festival, Retreat, Unconference, Hackathon, Workshop | `Conference` |
| Note | Optional, one short sentence after the type | `Developer-focused.` |

The parts are separated by ` · ` (a middle dot with spaces), and the type ends with a period.

Put the event under the month it **starts** in. Within a month, keep lines sorted by start date. An event running from Dec 30 to Jan 2 goes under `### December` as `Dec 30 – Jan 2`.

## What belongs in the list

- Bitcoin-focused events, or events with a substantial Bitcoin track.
- A working official page that confirms the dates and place.
- **No official page yet?** Add the event to [TO-VERIFY.md](TO-VERIFY.md) instead. Include where you saw it.

## Corrections

Edit the line directly in a pull request, or use the **[correction form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-correction.yml)**. If an event is cancelled, remove its line and mention the cancellation in the PR description.

## For maintainers

```bash
npm install
npm run check     # validate README.md + PAST.md (format, dates, order, duplicates)
npm test          # parser tests
npm run archive   # move events that have ended from README.md to PAST.md
npm run dev       # preview the website locally
```

- **Map pins:** the site looks up each `City, Country` in `data/places.json` (`"City, Country": [lat, lon]`). `npm run check` warns when a place is missing. Add it with coordinates from [OpenStreetMap](https://www.openstreetmap.org/); until then the event simply has no pin.
- **Archiving:** run `npm run archive` every month or so and commit the result. The website already shows ended events as past, so this only keeps the README short.
- **Code:** `src/lib/awesome-list.js` is the single parser for the format. The site (`src/pages/index.astro`), `scripts/check-list.mjs` and `scripts/archive-past.mjs` all use it.
