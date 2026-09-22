# Awesome Bitcoin Events 🌍

[![Deploy to GitHub Pages](https://github.com/itstomekk/awesome-bitcoin-events/actions/workflows/pages.yml/badge.svg)](https://github.com/itstomekk/awesome-bitcoin-events/actions/workflows/pages.yml)
[![Live calendar](https://img.shields.io/badge/live-calendar-f7931a?logo=bitcoin&logoColor=111111)](https://itstomekk.github.io/awesome-bitcoin-events/)
[![Community submissions](https://img.shields.io/badge/contributions-welcome-2f6f62)](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)

**A community-driven global calendar of Bitcoin conferences, meetups, retreats, festivals, and technical gatherings.**

Whether you're a developer, investor, filmmaker, or just curious about Bitcoin, this repository helps you discover and connect with the Bitcoin community worldwide. Every event is sourced from organizers and verified by the community — not guessed or auto-promoted.

## 🗺️ Explore the live calendar

**[Visit the interactive calendar →](https://itstomekk.github.io/awesome-bitcoin-events/)**

The live site features:

- 📅 **Upcoming-first browsing** — see what's happening next
- 🔍 **Smart filters** — search by year, region, format (conference/meetup/festival), and verification state
- 🗺️ **Interactive map** — discover events by location with OpenStreetMap integration
- 📍 **Event details** — organized, linked, and transparent sources for each listing
- ✅ **Source labels** — know if an event is officially confirmed, community-discovered, or needs review
- 📱 **Mobile-friendly** — full experience on phone, tablet, and desktop

> **This is a community directory, not an endorsement.** Always check the verification label and visit the organizer's official page before booking travel or tickets.

## Why this exists

Bitcoin events happen constantly — conferences, hackathons, film festivals, and community meetups across the globe. But they're scattered across Twitter, Discord, mailing lists, and personal blogs. **Awesome Bitcoin Events** brings them together in one honest, sourced, community-maintained calendar.

We believe:
- **Sources matter.** Every event includes a link back to where it came from.
- **Transparency beats completeness.** We'd rather say "we don't know if this is confirmed" than present guesses as facts.
- **Community knows best.** You and your peers are the best judges of what events are worth listing.

## 🚀 Add an event (2 minutes, no coding required)

Got a Bitcoin event to share? Help the community discover it.

1. **[Open the event submission form →](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-submission.yml)**
2. Fill in the event name, dates, location, and organizer link
3. Add a note about where you found it (official page, announcement, recommendation)
4. Submit — a maintainer will review and merge within days

Found a mistake, cancellation, or duplicate? **[Submit a correction →](https://github.com/itstomekk/awesome-bitcoin-events/issues/new?template=event-correction.yml)**

For full details, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 📊 How the data works

The repository keeps a clean separation between community input, verification, and publication:

```
community issue form (you)
        ↓
source & duplicate review (maintainers)
        ↓
canonical JSON + evidence links (data/)
        ↓
Astro static build
        ↓
GitHub Pages (live calendar)
```

### Verification states

Every event shows its current verification status:

| Label | Meaning |
|---|---|
| ✅ `official_page_seen` | Organizer's official page was checked; dates and location confirmed. |
| 🔍 `discovery_only` | Found in a credible source (Reddit, Twitter, etc.), but organizer confirmation pending. |
| ⚠️ `needs_review` | Sources conflict or key details are unclear; community input welcome. |
| 📦 `legacy_imported` | From our earlier dataset; awaiting re-confirmation. |

**No values are invented or guessed.** Dates are never assumed. If we don't know something, we say `null` — not make it up.

## 📁 Repository structure

| Path | Purpose |
|---|---|
| `data/events.json` | **Canonical dataset** — what the site reads and publishes |
| `data/sources.json` | **Source directory** — who runs what, quality notes, monitoring |
| `data/geo-cache.json` | **Map cache** — OpenStreetMap coordinates and attribution |
| `src/pages/` | **Astro site** — calendar UI, filters, map, event detail pages |
| `src/components/` | **Event cards** — reusable markup for listings |
| `src/styles/` | **Design system** — responsive layout, accessibility, map styling |
| `.github/ISSUE_TEMPLATE/` | **Community forms** — event submission and correction templates |
| `.github/workflows/pages.yml` | **Auto-deploy** — builds and publishes on each push to `main` |

See [`docs/REPOSITORY-GUIDE.md`](docs/REPOSITORY-GUIDE.md) for maintainer details and [`data/README.md`](data/README.md) for the data contract.

## 💻 Run locally

**Requirements:** Node.js 18+, Python 3 (optional, for tests)

```bash
# Install and start dev server
npm install
npm run dev
```

Open http://localhost:3000 — the site hot-reloads as you edit.

**For production build:**

```bash
npm run build
npm run preview  # local static preview
```

**Before opening a PR:**

```bash
npm run build
python -m pytest -q  # data integrity check
git diff --check
```

## 🔐 Privacy & security

This is a **public repository**. Never commit passwords, API keys, private email addresses, or internal notes. Use public organizer contact pages and channels only.

The Astro site in `src/` and versioned data in `data/` are the current build. Legacy files (`events.json`, `index.html`, `app.js`, `style.css` at root) are kept for reference but no longer maintained.

## 📢 Deployment

Every push to `main` triggers `.github/workflows/pages.yml`:
1. Builds the Astro site
2. Uploads to `dist/`
3. Deploys live to GitHub Pages

**Live URL:** https://itstomekk.github.io/awesome-bitcoin-events/

## 📚 Documentation

- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — how to add/update events
- **[`docs/REPOSITORY-GUIDE.md`](docs/REPOSITORY-GUIDE.md)** — for maintainers and developers
- **[`data/README.md`](data/README.md)** — data schema and field definitions
- **[`PLAN.md`](PLAN.md)** — roadmap and planned features
- **[`HANDOFF.md`](HANDOFF.md)** — current verified state and known issues
- **[`BUILD-LOG.md`](BUILD-LOG.md)** — build history and deployment evidence
- **[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)** — community standards

## 🤝 Community

Join the Bitcoin event community:
- **Submit events** via the issue form above
- **Report problems** — broken links, outdated info, duplicates
- **Suggest features** — better filters, new regions, data exports
- **Share findings** — tell us what you discover in the data

Questions? Open an issue or reach out to the maintainers.

---

Built with ❤️ for the Bitcoin community. Powered by [Astro](https://astro.build), [OpenStreetMap](https://www.openstreetmap.org/), and open-source principles.
