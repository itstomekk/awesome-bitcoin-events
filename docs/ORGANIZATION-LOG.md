# Organization log

## 2026-09-30 - Local checkout aligned with canonical `origin/main`

The local `main` branch had one local commit, was 16 commits behind upstream, and contained unresolved index stages plus untracked event-research files. Before aligning it with `origin/main` (`ba364b43001b1fb418bf1af7ac162931e9b6925c`), the prior working tree and Git index were preserved under `C:\Users\Lenovo\Hermes\_archive\2026-09-30-awesome-bitcoin-events-pre-main-sync\`; branch `backup/pre-canonical-main-20260930` retains the prior local commit.

Compared local event leads against the canonical lists. Three genuinely absent discovery-only leads were added to `TO-VERIFY.md`: Canadian Bitcoin Conference 2026, Golden Gate Bitcoin, and Bitcoin: A Competitive Advantage. They are not in `README.md` because the local records lacked organizer-owned event pages. Other apparent differences were already represented under updated names, or stale/unverified; Bitcoin MENA 2026 was rescheduled to 2027 and remains a verification lead.

The archived local work is a recovery source only. Do not merge its implementation or event rows wholesale into the canonical branch.

## 2026-10-01 - One table per year, a `/meetups` page, and a re-checked lead list

Format change: `README.md` and `PAST.md` now use **one table per year** instead of a table per month under a `### Month` heading. The month was already in the Date cell, so the headings were redundant. `src/lib/awesome-list.js` no longer accepts month headings and reports a migration hint for any `### <Month>` line, so the old shape cannot come back by accident. Date-order checks now run per year rather than per month. The website is unaffected: it groups parsed dates, not headings, so the month-by-month view stays.

Archived `Bitcoin Treasuries Conference 2026` (ended 2026-09-28) with `npm run archive`.

Lead re-check, using organizer-owned pages only:
- Promoted: **Bitcoin Japan 2026** (Nov 27-28, Tokyo, `btc-jpn.com`, announced in the organizer's press release) and **AI Startup Rodeo 2026** (Oct 30, Austin, `aistartuprodeo.com`).
- Dropped as cancelled by their organizers: **Canadian Bitcoin Conference 2026** (`canadianbitcoinconf.com`) and **Golden Gate Bitcoin Conference** (`conf.bayareabitcoiners.com`). Neither had been published in `README.md`, so no listed event was affected.
- Left as leads: Bitcoin: A Competitive Advantage (official page still shows the 2025 Derby edition, and sources disagree on the city), Bitcoin MENA 2027 (no dates published), Origin Seoul 2027 (the organizer site still advertises the 2026 edition).

Site: meetups gained a dedicated `/meetups` page (previously only an in-page tab). The region list moved into `src/components/MeetupList.astro` so the tab and the page render from one component. `src/layouts/BaseLayout.astro` now emits `rel=canonical`, `og:url` and `twitter:card`. The README gained a document link strip under the intro.

## 2026-10-01 - Repository root tidied

The root listed twelve loose files, several of them maintainer-facing rather than visitor-facing. Moved, with every reference rewritten in the same change:

| Was | Now |
| --- | --- |
| `CONTRIBUTING.md` | `.github/CONTRIBUTING.md` |
| `CODE_OF_CONDUCT.md` | `.github/CODE_OF_CONDUCT.md` |
| `ORGANIZATION-LOG.md` | `docs/ORGANIZATION-LOG.md` |

GitHub still detects both community files from `.github/`, so the Contributing tab and the Code of conduct chip are unaffected (confirmed against GitHub's documentation on adding a code of conduct and on setting contributor guidelines). Their internal relative links now use `../`, and every referring file was updated: `README.md` (link strip and the format paragraph), `MEETUPS.md`, `.github/ISSUE_TEMPLATE/config.yml`, the `scripts/check-list.mjs` error message, `src/layouts/BaseLayout.astro`, `src/lib/awesome-list.js`, `src/pages/index.astro`, `src/pages/meetups.astro`, and `HANDOFF.md`.

`HANDOFF.md` and `PLAN.md` stay in the root on purpose: the workspace registry (`C:\Users\Lenovo\.agents\refresh.py`) looks for `PLAN.md` and `HANDOFF.md` directly in the project folder and would otherwise report PLAN DEBT and NOHAND findings for this project. `ORGANIZATION-LOG.md` is one of its markers too, so this project's marker row in `REGISTRY.md` now lists PLAN, HANDOFF and README only; that is cosmetic, because no finding logic reads it.

Deliberately not moved: `README.md` (required at the root and parsed by the site), `LICENSE` (GitHub detects it only at the root), `PAST.md`, `MEETUPS.md` and `TO-VERIFY.md` (the list content, linked from the README and read by the site), and the build configuration (`package.json`, `package-lock.json`, `astro.config.mjs`).
