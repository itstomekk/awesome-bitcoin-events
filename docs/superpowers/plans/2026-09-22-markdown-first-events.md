# Markdown-first Awesome Bitcoin Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one Markdown file per dated event the canonical content source, render the existing Astro map/filter/detail site directly from those files, and turn the repository README into a proper Awesome-style list.

**Architecture:** `src/content/events/**/*.md` holds every dated event. A small public frontmatter surface makes community PRs easy; a clearly marked optional `maintainer` object preserves source evidence, verification, coordinates, legacy payloads, and other enriched metadata. Astro 5 Content Collections validates and loads the Markdown files directly, while the old JSON dataset is retained only as a migration input and reference until the branch is accepted.

**Tech Stack:** Astro 5.14 Content Collections, Zod, Markdown/YAML frontmatter, Node 20, Python 3 + PyYAML for the one-time migration, existing Astro static build and pytest suite.

---

## File structure

- Create: `src/content.config.ts` — Content Collection schema and normalization contract.
- Create: `src/content/events/<year>/<slug>.md` — canonical event files, migrated from the existing event dataset.
- Create: `src/lib/content-events.js` — collection entry to existing UI event-object adapter.
- Create: `scripts/migrate_events_to_markdown.py` — idempotent one-time migration from `data/events.json`.
- Create: `scripts/build_event_lists.mjs` — emits `README.md` upcoming section and full `EVENTS.md` from Markdown event content.
- Create: `tests/test_migrate_events_to_markdown.py` — migration preservation tests.
- Create: `tests/test_event_markdown_contract.py` — Markdown collection field/round-trip tests.
- Modify: `src/lib/events.js` — retain display helpers only; stop importing JSON.
- Modify: `src/pages/index.astro` — load collection entries, adapt them for cards, filters, and the map.
- Modify: `src/pages/events/[id].astro` — build pages from collection entries and render Markdown descriptions.
- Modify: `README.md` — primary Awesome-style landing page with generated upcoming event table.
- Create: `EVENTS.md` — generated full list, including past archive.
- Modify: `CONTRIBUTING.md`, `data/README.md`, `docs/REPOSITORY-GUIDE.md`, `.github/ISSUE_TEMPLATE/config.yml`, `PLAN.md`, `HANDOFF.md` — documentation and project-state corrections.

## Task 1: Define the Markdown event contract and migration proof

**Files:**
- Create: `tests/test_migrate_events_to_markdown.py`
- Create: `scripts/migrate_events_to_markdown.py`
- Create: `src/content.config.ts`

- [ ] Write tests for one normal official event and one migrated legacy/discovery event.
- [ ] Confirm migration preserves all displayed event properties, all source observations, verification information, aliases, legacy payloads, extensions, and coordinates.
- [ ] Implement an idempotent migration that writes frontmatter with a small public surface first (`title`, dates, human-readable location, official URL, format, description) and an optional `maintainer` block after it.
- [ ] Use the schema to validate event Markdown at Astro build time; contributor-only fields must be sufficient for a newly submitted event.
- [ ] Run targeted migration tests, then `python -m pytest -q`.

## Task 2: Migrate the dataset and adapt Astro to Content Collections

**Files:**
- Create: `src/content/events/**/*.md`
- Create: `src/lib/content-events.js`
- Modify: `src/lib/events.js`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/events/[id].astro`

- [ ] Run the migration against `data/events.json`; do not delete the old JSON input in this experimental branch.
- [ ] Add a collection adapter that exposes the existing UI shape so cards, grouping, map filtering, and evidence labels keep working.
- [ ] Replace direct JSON imports in the two dated-event pages with `getCollection('events')`.
- [ ] Render each Markdown body on its event detail page.
- [ ] Run `npm ci`, `npm run build`, `python -m pytest -q`, and `git diff --check`.

## Task 3: Generate the Awesome-style Markdown list and simplify README

**Files:**
- Create: `scripts/build_event_lists.mjs`
- Create: `EVENTS.md`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] Generate a concise upcoming table inside README between stable markers. Rows must include date, event, location, type, and official link.
- [ ] Generate `EVENTS.md` with every event, sorted by date and grouped by year. Historical sections use collapsible details blocks.
- [ ] Make README list-first: brief promise, Browse/Add/Correction links, upcoming events, short contribution instructions, the website as optional map/filter view, then links to technical docs.
- [ ] Update contribution wording from canonical JSON to canonical Markdown; retain issue forms as the no-Git path.
- [ ] Make the list script deterministic and verify it does not change its own output on a second run.

## Task 4: Document the source-of-truth change and verify the comparison branch

**Files:**
- Modify: `data/README.md`
- Modify: `docs/REPOSITORY-GUIDE.md`
- Modify: `PLAN.md`
- Modify: `HANDOFF.md`

- [ ] Document the source path: event Markdown → Astro Content Collection → static Pages site; reserve `sources.json` and `geo-cache.json` for supporting registries.
- [ ] Record that the old `data/events.json` remains a migration/reference snapshot on this experimental branch and is no longer site input.
- [ ] Verify record count, event IDs, official URLs, dates, source-observation counts, and map-coordinate counts agree between the JSON input and migrated Markdown collection.
- [ ] Run full tests, production build with `PUBLIC_BASE_PATH=/awesome-bitcoin-events`, `git diff --check`, and inspect generated README/EVENTS output.
- [ ] Compare the experiment worktree with `main`; do not merge, push, or delete the original JSON until Tomek approves the diff.
