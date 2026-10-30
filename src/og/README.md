# Per-event share cards

Every event page (`/events/<slug>/`) has its own link-preview image, `og/events/<slug>.jpg`,
drawn at build time by `src/lib/event-card.js`:

- `art/<slug>.jpg`: 1200x630 background made with GPT Image from the event's city (landmarks and
  atmosphere) in the event's colours, with the rabbit mascot small inside the scene. The art has no
  text; title, dates and place are drawn in code so they are always exact.
- `theme.json`: per slug, the event's leading `color` (from its own site: `theme-color`, else the
  logo, else its og:image), a `style` (`cine`, `cards` or `flat`, each `dark` or `bright`) and
  whether a `logo` exists.
- `logos/<slug>.png`: the event's own logo (touch icon), 160 px max, shown in a cream tile.
- `fonts/`: Archivo Black and Space Mono Bold, the Awesome Bitcoin Culture pair.

The left of each card fades into a dark tint (dark styles) or a pale tint (bright styles) of the
event colour. Styles rotate through the six combinations so the list does not look uniform.

## A new event has no art yet

That is fine. `hasEventCard(slug)` is false, so the page falls back to the plain typographic card
(`og/events/<slug>.png`, upcoming events) or the shared `og.jpg` (past events). Nothing fails.

## Adding art for new events

The generator lives outside the repo (it needs the maintainer's Codex login):
`C:/Users/Lenovo/Hermes/image-gen/2026-10-30-abe-og/gen/` (`run.py`, `prep_assets.py`).
`python run.py specs` builds one prompt per event, `python run.py gen` generates the missing art
(resumable), `python prep_assets.py` copies art, logos and `theme.json` into this folder. Review the
result on a contact sheet before committing: look for stray text in the art and wrong logos.
