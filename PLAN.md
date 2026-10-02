# Awesome Bitcoin Events plan

## Goal

Keep the GitHub README as the canonical, contributor-editable event list; use the website as a derived browse/search/map view. Keep unverified discoveries separate from confirmed public listings.

## Current architecture

- [x] `README.md` is the source of truth for upcoming events.
- [x] `PAST.md` archives past events; `TO-VERIFY.md` holds discovery leads that lack an organizer-owned page.
- [x] GitHub issue forms support event submissions and corrections.
- [x] Astro builds the static site from the lists and deploys through GitHub Pages.
- [x] Every event link points at the organizer's own page, and `TO-VERIFY.md` holds the rest.
- [x] Recurring meetups have a dedicated `/meetups` page as well as a tab on the home page.

## Priorities

- [ ] Verify and promote qualified entries from `TO-VERIFY.md`; do not publish uncertain dates as confirmed events. Three leads remain: Bitcoin: A Competitive Advantage, Bitcoin MENA 2027, Origin Seoul 2027.
- [ ] Improve technical SEO and sharing metadata: canonical URLs and `og:url` are done; sitemap, `robots.txt`, `og:image` and search indexing are still open.
- [ ] Maintain reliable link health without deleting historical records automatically.
- [ ] Keep list contributions simple and run `npm run check`, `npm test`, and `npm run build` before delivery.

## Operating rules

- `origin/main` is canonical for repository code and existing event records.
- Merge only genuinely missing local event leads; do not overwrite or duplicate records already represented on main.
- Keep discovery-only events in `TO-VERIFY.md` until their organizer-owned pages confirm details.
- Keep one table per year in `README.md` and `PAST.md`. Never add `### Month` headings: `npm run check` rejects them. The month belongs in the Date cell.
- Do not submit this Bitcoin-specific list to `sindresorhus/awesome`; its current contribution rules exclude blockchain-related lists.
