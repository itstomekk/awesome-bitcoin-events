# Contributing

Thanks for helping keep Awesome Bitcoin Events useful. The whole list lives in **[README.md](README.md)**. That file is the source of truth, and the [website](https://itstomekk.github.io/awesome-bitcoin-events/) is built from it automatically.

## Add an event (2 minutes, no tools needed)

1. Open [README.md](README.md) on GitHub and click the ✏️ pencil icon.
2. Find the right `## Year` and `### Month` heading and add one row to that month's table, in date order:

   ```markdown
   | Oct 12–15 | [Event name](https://official-event-page) | City, Country | Conference |
   ```

   New month? Add the heading plus the two table header lines:

   ```markdown
   ### November

   | Date | Event | Location | Type |
   | --- | --- | --- | --- |
   ```

3. Click **Propose changes**, then **Create pull request**. An automatic check tells you, with the line number, if something is off.

Don't want to edit Markdown? Use the **[event submission form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)** and a maintainer will add the line.

## The row format

```
| Date | Event | Location | Type |
```

| Column | Rules | Examples |
| --- | --- | --- |
| Date | 3-letter month plus day, using the year from the heading. Use an en dash `–` or a hyphen `-` for ranges. | `Oct 24` · `Oct 12–15` · `Oct 29 – Nov 1` |
| Event | `[Name](link)`. The link is the **organizer's own page** (https). Aggregators, ticket resellers and social posts don't count. | `[TABConf 8](https://tabconf.com/)` |
| Location | `City, Country`, just the country, or `Online` | `Atlanta, USA` · `Hong Kong` · `Online` |
| Type | One of: Conference, Meetup, Festival, Retreat, Unconference, Hackathon, Workshop | `Conference` |

Don't use a `|` character inside a cell.

Put the event under the month it **starts** in. Within a month, keep lines sorted by start date. An event running from Dec 30 to Jan 2 goes under `### December` as `Dec 30 – Jan 2`.

## Meetups

Recurring meetups live in [MEETUPS.md](MEETUPS.md), one table per region (Europe, North America, Latin America, Asia, Oceania, Africa, Middle East, Online):

```markdown
| Prague, Czech Republic | [Bitcoin Prague](https://official-link) | Monthly meetup |
```

The columns are Where (`City, Country` or `Online`), Meetup (`[Name](link)`, preferably the group's own page or Meetup.com group) and About (a few words, for example `Socratic Seminar` or `Monthly meetup`). Each link may appear only once.

## What belongs in the list

- Bitcoin-focused events, or events with a substantial Bitcoin track.
- A working official page that confirms the dates and place.
- **No official page yet?** Add the event to [TO-VERIFY.md](TO-VERIFY.md) instead. Include where you saw it.

## Where to find events

Use these to discover events, then confirm each one on the organizer's own page before listing it.

- [BitcoinOnly Events](https://bitcoinonly.events/): Bitcoin-only conference calendar.
- [Bitbo conferences](https://bitbo.io/tools/conferences/): Bitcoin-only conferences worldwide.
- [BTC Events Map](https://btceventsmap.com/): map of Bitcoin events and meetups.
- [Plan ₿ Network events](https://planb.network/en/events): conferences and workshops.
- [European Bitcoiners events](https://europeanbitcoiners.com/events/): European Bitcoin events.
- [BitDevs](https://bitdevs.org/): technical Socratic Seminars by city.
- [bitcoin++](https://btcpp.dev/): developer conference series.
- [Bitcoin Magazine industry events](https://bitcoinmagazine.com/industry-events): editorial calendar.
- [Bitcoin Bundesverband](https://bitcoin-bundesverband.de/en/events/): German events.
- [Bitcoin Events South Africa](https://bitcoinevents.co.za/): South African events.
- [Satlantis](https://www.satlantis.io/) and [Plektos](https://plektos.app): Nostr-based event calendars.



Edit the row directly in a pull request, or use the **[correction form](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-correction.yml)**. If an event is cancelled, remove its row and mention the cancellation in the PR description.

## For maintainers

```bash
npm install
npm run check     # validate README.md + PAST.md (format, dates, order, duplicates)
npm test          # parser tests
npm run archive   # move events that have ended from README.md to PAST.md
npm run dev       # preview the website locally
```

- **Event details:** `npm run enrich` reads each upcoming event's official page and stores its short description and preview image in `data/details.json`, keyed by the event link. Review the diff before committing: some sites return cookie text or last year's blurb. For entries you write or fix by hand, set `"source": "manual"`, and the script will never overwrite them.
- **Map pins:** the site looks up each `City, Country` in `data/places.json` (`"City, Country": [lat, lon]`). `npm run check` warns when a place is missing. Add it with coordinates from [OpenStreetMap](https://www.openstreetmap.org/); until then the event simply has no pin.
- **Archiving:** run `npm run archive` every month or so and commit the result. The website already shows ended events as past, so this only keeps the README short.
- **Code:** `src/lib/awesome-list.js` is the single parser for the format. The site (`src/pages/index.astro`), `scripts/check-list.mjs` and `scripts/archive-past.mjs` all use it.
