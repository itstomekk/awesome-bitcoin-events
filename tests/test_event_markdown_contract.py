import html
import json
import re
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "src" / "content.config.ts"
MIGRATION = ROOT / "scripts" / "migrate_events_to_markdown.py"
# AUDIT NOTE: ".cmd" binaries exist only on Windows; on Linux/macOS these build tests fail
# with FileNotFoundError (8 of 45 tests). CI does not run pytest, so this went unnoticed.
ASTRO = ROOT / "node_modules" / ".bin" / "astro.cmd"


def run_astro_build(project_dir: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(ASTRO), "build"],
        cwd=project_dir,
        capture_output=True,
        text=True,
    )


def create_collection_project(markdown: str) -> tuple[Path, TemporaryDirectory[str]]:
    temp_dir = TemporaryDirectory(prefix="astro-content-test-", dir=ROOT)
    project_dir = Path(temp_dir.name)
    (project_dir / "src" / "content" / "events").mkdir(parents=True)
    (project_dir / "src" / "content.config.ts").write_text(SCHEMA.read_text(encoding="utf-8"), encoding="utf-8")
    (project_dir / "astro.config.mjs").write_text(
        "import { defineConfig } from 'astro/config';\nexport default defineConfig({ output: 'static' });\n",
        encoding="utf-8",
    )
    (project_dir / "src" / "content" / "events" / "event.md").write_text(markdown, encoding="utf-8")
    (project_dir / "src" / "pages").mkdir()
    (project_dir / "src" / "pages" / "index.astro").write_text(
        """---
import { getCollection } from 'astro:content';
const [event] = await getCollection('events');
const loadedMaintainer = JSON.stringify(event.data.maintainer);
---
<h1>{event.data.title}</h1>
<script id=\"loaded-maintainer\" type=\"application/json\" set:html={loadedMaintainer}></script>
""",
        encoding="utf-8",
    )
    return project_dir, temp_dir


def migrated_event() -> dict:
    return {
        "id": "evt-rich-2026-2026-10-10-berlin",
        "title": "Rich Bitcoin Event",
        "series": "Rich Series",
        "dates": {
            "start": "2026-10-10",
            "end": "2026-10-12",
            "timezone": "Europe/Berlin",
            "precision": "day",
        },
        "location": {
            "venue": "Berlin Hall",
            "city": "Berlin",
            "region": None,
            "country": "Germany",
            "country_code": "DE",
            "latitude": 52.52,
            "longitude": 13.405,
            "coordinates_precision": "venue",
        },
        "classification": {
            "event_type": "conference",
            "topics": ["Bitcoin", "privacy"],
            "bitcoin_relevance": "bitcoin_focused",
            "delivery_mode": "in_person",
        },
        "organizer": {"name": "Rich Organizer", "urls": ["https://example.test/organizer"]},
        "links": {
            "official_url": "https://example.test/rich-event",
            "registration_url": "https://example.test/rich-event/tickets",
            "livestream_url": None,
            "social_urls": ["https://example.test/rich-event/social"],
        },
        "description": "A rich migrated event.",
        "media": {"image_url": "https://example.test/rich-event.jpg"},
        "lifecycle": {"status": "announced", "published": True, "cancelled": False},
        "verification": {
            "state": "legacy_imported",
            "confidence": "medium",
            "last_verified_at": "2026-09-22T12:00:00Z",
            "notes": "Migrated from the canonical dataset.",
        },
        "source_observations": [
            {
                "source_id": "rich-source",
                "source_url": "https://example.test/source",
                "event_url": "https://example.test/rich-event",
                "access_method": "test_fixture",
                "observed_at": "2026-09-22T12:00:00Z",
                "fields_observed": ["title", "dates", "location"],
                "raw_excerpt": "Rich Bitcoin Event — October 10–12, Berlin",
            }
        ],
        "aliases": ["Rich Event"],
        "legacy_payload": {"legacy_id": 42},
        "legacy_dataset": {"dataset": "events.json"},
        "extensions": {"map": {"coordinates_source": "test-fixture"}},
    }


def migrated_markdown(tmp_path: Path) -> tuple[str, dict]:
    event = migrated_event()
    input_path = tmp_path / "events.json"
    output_dir = tmp_path / "events"
    input_path.write_text(json.dumps({"events": [event]}), encoding="utf-8")
    result = subprocess.run(
        [
            sys.executable,
            str(MIGRATION),
            "--input",
            str(input_path),
            "--output-dir",
            str(output_dir),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    markdown_path = output_dir / "2026" / "rich-bitcoin-event.md"
    return markdown_path.read_text(encoding="utf-8"), event


def test_contributor_only_markdown_builds_without_maintainer(tmp_path):
    project_dir, temp_dir = create_collection_project(
        """---
title: Community Meetup
start: 2026-09-22
location: Online
url: https://example.test/community-meetup
---
"""
    )
    try:
        result = run_astro_build(project_dir)
        assert result.returncode == 0, result.stderr
        assert "Community Meetup" in (project_dir / "dist" / "index.html").read_text(encoding="utf-8")
    finally:
        temp_dir.cleanup()


def test_contributor_only_markdown_with_null_url_is_invalid(tmp_path):
    project_dir, temp_dir = create_collection_project(
        """---
title: Missing URL Meetup
start: 2026-09-22
location: Online
url: null
---
"""
    )
    try:
        result = run_astro_build(project_dir)
        assert result.returncode != 0
        assert "url" in html.unescape(result.stdout + result.stderr).lower()
    finally:
        temp_dir.cleanup()


def test_migrated_markdown_with_non_null_url_preserves_maintainer_at_load_time(tmp_path):
    markdown, expected_maintainer = migrated_markdown(tmp_path)
    project_dir, temp_dir = create_collection_project(markdown)
    try:
        result = run_astro_build(project_dir)
        assert result.returncode == 0, result.stderr
        output = html.unescape((project_dir / "dist" / "index.html").read_text(encoding="utf-8"))
        match = re.search(r'<script[^>]*id="loaded-maintainer"[^>]*>(.*?)</script>', output, re.DOTALL)
        assert match, output
        assert json.loads(match.group(1)) == expected_maintainer
    finally:
        temp_dir.cleanup()
