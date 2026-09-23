#!/usr/bin/env python3
"""Migrate the canonical event JSON dataset into Markdown content files."""

# Pipeline step 2 (historical, one-off): data/events.json -> src/content/events/<year>/*.md.
# After this ran, the .md files became canonical and data/events.json a frozen snapshot.

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any

import yaml


def slugify(value: str) -> str:
    """Return a stable, filesystem-safe slug for an event title."""
    ascii_value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "untitled"


def parse_event_dates(event: dict[str, Any]) -> tuple[str, str | None]:
    dates = event.get("dates")
    if not isinstance(dates, dict):
        raise ValueError(f"event {event.get('id', '<unknown>')!r} must have a dates object")

    start = dates.get("start")
    if not isinstance(start, str):
        raise ValueError(f"event {event.get('id', '<unknown>')!r} must have an ISO start date")
    try:
        start_day = date.fromisoformat(start)
    except ValueError as error:
        raise ValueError(f"event {event.get('id', '<unknown>')!r} has an invalid start date: {start!r}") from error

    end = dates.get("end")
    if end is not None:
        if not isinstance(end, str):
            raise ValueError(f"event {event.get('id', '<unknown>')!r} has an invalid end date")
        try:
            end_day = date.fromisoformat(end)
        except ValueError as error:
            raise ValueError(f"event {event.get('id', '<unknown>')!r} has an invalid end date: {end!r}") from error
        if end_day < start_day:
            raise ValueError(f"event {event.get('id', '<unknown>')!r} ends before it starts")

    return start, end


def human_location(location: Any) -> str:
    if not isinstance(location, dict):
        return ""

    parts: list[str] = []
    for key in ("venue", "city", "region", "country"):
        value = location.get(key)
        if not isinstance(value, str) or not value.strip():
            continue
        cleaned = value.strip()
        if cleaned.casefold() not in {part.casefold() for part in parts}:
            parts.append(cleaned)
    return ", ".join(parts)


def public_frontmatter(event: dict[str, Any]) -> dict[str, Any]:
    title = event.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError(f"event {event.get('id', '<unknown>')!r} must have a non-empty title")

    start, end = parse_event_dates(event)
    classification = event.get("classification")
    if not isinstance(classification, dict):
        classification = {}
    links = event.get("links")
    if not isinstance(links, dict):
        links = {}

    frontmatter: dict[str, Any] = {
        "title": title.strip(),
        "start": start,
        "location": human_location(event.get("location")),
        "url": links.get("official_url"),
        "format": classification.get("event_type") or classification.get("delivery_mode"),
        # Keep the complete source record in the maintainer-owned block. This makes
        # the migration lossless while keeping contributor-facing fields small.
        "maintainer": copy.deepcopy(event),
    }
    if end is not None:
        frontmatter["end"] = end

    # Keep the public field order stable and put the optional end date beside start.
    ordered_frontmatter = {
        "title": frontmatter.pop("title"),
        "start": frontmatter.pop("start"),
    }
    if "end" in frontmatter:
        ordered_frontmatter["end"] = frontmatter.pop("end")
    ordered_frontmatter.update(frontmatter)
    return ordered_frontmatter


def render_event(event: dict[str, Any]) -> str:
    description = event.get("description")
    body = description.strip("\n") if isinstance(description, str) else ""
    body = f"{body}\n" if body else ""
    frontmatter = yaml.safe_dump(
        public_frontmatter(event),
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
    )
    return f"---\n{frontmatter}---\n{body}"


def load_events(input_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("events"), list):
        raise ValueError("input must be a JSON object with an events array")
    events = payload["events"]
    if not all(isinstance(event, dict) for event in events):
        raise ValueError("every item in events must be a JSON object")
    return events


def output_paths(events: list[dict[str, Any]]) -> list[tuple[Path, dict[str, Any]]]:
    paths: list[tuple[Path, dict[str, Any]]] = []
    used: set[Path] = set()
    ordered_events = sorted(
        events,
        key=lambda event: (
            parse_event_dates(event)[0],
            str(event.get("title", "")),
            str(event.get("id", "")),
        ),
    )

    for event in ordered_events:
        start, _ = parse_event_dates(event)
        year = start[:4]
        title_slug = slugify(str(event.get("title", "")))
        relative_path = Path(year) / f"{title_slug}.md"
        if relative_path in used:
            relative_path = Path(year) / f"{title_slug}-{start}.md"
        if relative_path in used:
            relative_path = Path(year) / f"{title_slug}-{slugify(str(event.get('id', 'event')))}.md"
        if relative_path in used:
            raise ValueError(f"events would produce duplicate output path: {relative_path}")
        used.add(relative_path)
        paths.append((relative_path, event))
    return paths


def migrate(input_path: Path, output_dir: Path, overwrite: bool = False) -> int:
    events = load_events(input_path)
    planned = output_paths(events)
    rendered = [
        (output_dir / relative_path, render_event(event))
        for relative_path, event in planned
    ]
    changed = [
        destination
        for destination, content in rendered
        if destination.exists() and destination.read_bytes() != content.encode("utf-8")
    ]
    if changed and not overwrite:
        first = changed[0]
        raise FileExistsError(f"output file differs: {first} (use --overwrite to replace it)")

    for destination, content in rendered:
        if destination.exists() and destination.read_bytes() == content.encode("utf-8"):
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(content, encoding="utf-8", newline="\n")

    print(f"migrated {len(events)} events to {output_dir}")
    return len(events)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    try:
        migrate(args.input, args.output_dir, overwrite=args.overwrite)
    except (FileExistsError, OSError, TypeError, ValueError, json.JSONDecodeError, yaml.YAMLError) as error:
        print(f"migration failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
