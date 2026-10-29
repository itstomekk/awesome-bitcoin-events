# Awesome Bitcoin Events plan

## Goal

Keep the GitHub README as the canonical, contributor-editable event list; use the website as a derived browse/search/map view. Keep unverified discoveries separate from confirmed public listings.

## Current architecture

- [x] `README.md` is the source of truth for upcoming events.
- [x] `PAST.md` archives past events; `TO-VERIFY.md` holds discovery leads that lack an organizer-owned page.
- [x] GitHub issue forms support event submissions and corrections.
- [x] Astro builds the static site from the lists and deploys through GitHub Pages.
- [x] Every event link points at the organizer's own page, and `TO-VERIFY.md` holds the rest.
- [x] Recurring meetups are a tab on the home page. There is no separate `/meetups` page yet (planned, see priorities).

## Priorities

- [ ] Verify and promote qualified entries from `TO-VERIFY.md`; do not publish uncertain dates as confirmed events. Three leads remain: Bitcoin: A Competitive Advantage, Bitcoin MENA 2027, Origin Seoul 2027.
- [x] Technical SEO basics: canonical URLs, `og:url`, sitemap, `robots.txt` with Content-Signal, `og:image`, `llms.txt`, Markdown copy, absolute JSON-LD image URLs.
- [x] Generated pages (`src/lib/pages-model.js`): `/events/<slug>/` for every event, plus `/country/`, `/year/`, `/type/`, `/meetups/` and `/meetups/<region>/`. Each has its own title, description, canonical, JSON-LD and breadcrumbs; indexable pages also get a Markdown copy, a build-time OG card (`/og/...png`) and a sitemap entry. Events get a `.ics` file. Past events and archive-only hubs are noindex and out of the sitemap. A daily scheduled deploy keeps that in step with the calendar.
- [x] Feeds: `/calendar.ics` (all upcoming events, subscribable), `/events.json` (whole list, CC0) and `/feed.xml` (Atom, next 50 events), linked in `<head>`, the Browse block and `llms.txt`.
- [ ] Submit the sitemap to Google Search Console and Bing, add IndexNow.
- [ ] Maintain reliable link health without deleting historical records automatically.
- [ ] Keep list contributions simple and run `npm run check`, `npm test`, and `npm run build` before delivery.

## Operating rules

- `origin/main` is canonical for repository code and existing event records.
- Merge only genuinely missing local event leads; do not overwrite or duplicate records already represented on main.
- Keep discovery-only events in `TO-VERIFY.md` until their organizer-owned pages confirm details.
- Keep one table per year in `README.md` and `PAST.md`. Never add `### Month` headings: `npm run check` rejects them. The month belongs in the Date cell.
- Do not submit this Bitcoin-specific list to `sindresorhus/awesome`; its current contribution rules exclude blockchain-related lists.
