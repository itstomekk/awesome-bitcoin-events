import json
import subprocess
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "migrate_events_to_markdown.py"


def run_migration(input_path: Path, output_dir: Path, *extra_args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--input",
            str(input_path),
            "--output-dir",
            str(output_dir),
            *extra_args,
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


def read_markdown(path: Path) -> tuple[dict, str]:
    content = path.read_text(encoding="utf-8")
    assert content.startswith("---\n")
    _, frontmatter, body = content.split("---\n", 2)
    return yaml.safe_load(frontmatter), body.lstrip("\n")


def event_fixture() -> tuple[dict, dict]:
    official = {
        "id": "evt-bitcoin-summit-2026-2026-06-10-berlin",
        "title": "Bitcoin Summit 2026",
        "series": "Bitcoin Summit",
        "dates": {
            "start": "2026-06-10",
            "end": "2026-06-12",
            "timezone": "Europe/Berlin",
            "precision": "day",
        },
        "location": {
            "venue": "Berlin Congress Center",
            "city": "Berlin",
            "region": None,
            "country": "Germany",
            "country_code": "DE",
            "latitude": 52.520008,
            "longitude": 13.404954,
            "coordinates_precision": "venue",
        },
        "classification": {
            "event_type": "conference",
            "topics": ["Bitcoin", "adoption"],
            "bitcoin_relevance": "bitcoin_focused",
            "delivery_mode": "in_person",
        },
        "organizer": {"name": "Bitcoin Summit", "urls": ["https://summit.example/organizer"]},
        "links": {
            "official_url": "https://summit.example/2026",
            "registration_url": "https://summit.example/2026/tickets",
            "livestream_url": None,
            "social_urls": ["https://social.example/summit"],
        },
        "description": "A Bitcoin-focused summit in Berlin.",
        "media": {"image_url": "https://summit.example/image.jpg"},
        "lifecycle": {"status": "announced", "published": True, "cancelled": False},
        "verification": {
            "state": "official_page_seen",
            "confidence": "high",
            "last_verified_at": "2026-05-01T12:00:00Z",
            "notes": "Confirmed on the organizer page.",
        },
        "source_observations": [
            {
                "source_id": "official-summit",
                "source_url": "https://summit.example/2026",
                "event_url": "https://summit.example/2026",
                "access_method": "web_extract",
                "observed_at": "2026-05-01T12:00:00Z",
                "fields_observed": ["title", "dates", "location"],
                "raw_excerpt": "Bitcoin Summit 2026 — June 10–12, Berlin",
            }
        ],
        "aliases": ["Berlin Bitcoin Summit"],
        "extensions": {"map": {"coordinates_source": "test-geocoder"}},
    }
    discovery = {
        "id": "evt-freedom-tech-2026-2026-09-22-washington",
        "title": "Freedom Tech DC 2026",
        "series": None,
        "dates": {
            "start": "2026-09-22",
            "end": "2026-09-23",
            "timezone": None,
            "precision": "day",
        },
        "location": {
            "venue": None,
            "city": "Washington",
            "region": "DC",
            "country": "USA",
            "country_code": None,
            "latitude": 38.8950982,
            "longitude": -77.0363849,
            "coordinates_precision": "city_centroid",
        },
        "classification": {
            "event_type": "conference",
            "topics": ["Bitcoin", "freedom tech"],
            "bitcoin_relevance": "bitcoin_focused",
            "delivery_mode": "in_person",
        },
        "organizer": {"name": None, "urls": []},
        "links": {
            "official_url": None,
            "registration_url": None,
            "livestream_url": None,
            "social_urls": [],
        },
        "description": None,
        "media": {"image_url": None},
        "lifecycle": {"status": "announced", "published": None, "cancelled": False},
        "verification": {
            "state": "discovery_only",
            "confidence": "medium",
            "last_verified_at": None,
            "notes": "Imported from a discovery scan.",
        },
        "source_observations": [
            {
                "source_id": "bitcoinonly-events",
                "reported_source_id": "bitcoinonly",
                "source_url": "https://bitcoinonly.events/",
                "event_url": None,
                "access_method": "web_extract",
                "observed_at": "2026-09-16T00:00:00Z",
                "raw_excerpt": "Sep 22-23 2026 Freedom Tech DC 2026 Washington, DC",
            },
            {
                "source_id": "btc-events-map",
                "source_url": "https://btceventsmap.com/",
                "event_url": None,
                "access_method": "web_extract",
                "observed_at": "2026-09-16T00:00:00Z",
                "raw_excerpt": "Freedom Tech DC 2026",
            },
        ],
        "aliases": ["Freedom Tech Washington"],
        "legacy_payload": {"id": 17, "name": "Freedom Tech DC 2026", "dates": "Sep 22-23"},
        "legacy_dataset": {"year": 2026, "updated": "2026-09-01"},
        "extensions": {
            "source_scan": {"schema_version": "research-source-scan-1.0"},
            "map": {"coordinates_source": "OpenStreetMap Nominatim"},
        },
    }
    return official, discovery


def test_migration_preserves_official_event_and_renders_markdown_description(tmp_path):
    official, discovery = event_fixture()
    input_path = tmp_path / "events.json"
    output_dir = tmp_path / "events"
    input_path.write_text(json.dumps({"events": [official, discovery]}), encoding="utf-8")

    result = run_migration(input_path, output_dir)

    assert result.returncode == 0, result.stderr
    frontmatter, body = read_markdown(output_dir / "2026" / "bitcoin-summit-2026.md")
    assert frontmatter["title"] == official["title"]
    assert frontmatter["start"] == "2026-06-10"
    assert frontmatter["end"] == "2026-06-12"
    assert frontmatter["location"] == "Berlin Congress Center, Berlin, Germany"
    assert frontmatter["url"] == official["links"]["official_url"]
    assert frontmatter["format"] == "conference"
    assert body == "A Bitcoin-focused summit in Berlin.\n"
    assert frontmatter["maintainer"] == official


def test_migration_preserves_discovery_metadata_without_inventing_official_url(tmp_path):
    official, discovery = event_fixture()
    input_path = tmp_path / "events.json"
    output_dir = tmp_path / "events"
    input_path.write_text(json.dumps({"events": [official, discovery]}), encoding="utf-8")

    result = run_migration(input_path, output_dir)

    assert result.returncode == 0, result.stderr
    frontmatter, body = read_markdown(output_dir / "2026" / "freedom-tech-dc-2026.md")
    assert frontmatter["url"] is None
    assert frontmatter["format"] == "conference"
    assert body == ""
    assert frontmatter["maintainer"]["id"] == discovery["id"]
    assert frontmatter["maintainer"]["location"]["latitude"] == discovery["location"]["latitude"]
    assert frontmatter["maintainer"]["source_observations"] == discovery["source_observations"]
    assert frontmatter["maintainer"]["aliases"] == discovery["aliases"]
    assert frontmatter["maintainer"]["legacy_payload"] == discovery["legacy_payload"]
    assert frontmatter["maintainer"]["legacy_dataset"] == discovery["legacy_dataset"]
    assert frontmatter["maintainer"]["extensions"] == discovery["extensions"]
    assert frontmatter["maintainer"]["verification"] == discovery["verification"]


def test_identical_second_migration_is_a_byte_exact_no_op(tmp_path):
    official, discovery = event_fixture()
    input_path = tmp_path / "events.json"
    output_dir = tmp_path / "events"
    input_path.write_text(json.dumps({"events": [official, discovery]}), encoding="utf-8")

    first = run_migration(input_path, output_dir)
    assert first.returncode == 0, first.stderr
    before = {
        path.relative_to(output_dir): (path.read_bytes(), path.stat().st_mtime_ns)
        for path in output_dir.rglob("*.md")
    }

    second = run_migration(input_path, output_dir)

    assert second.returncode == 0, second.stderr
    after = {
        path.relative_to(output_dir): (path.read_bytes(), path.stat().st_mtime_ns)
        for path in output_dir.rglob("*.md")
    }
    assert after == before


def test_changed_existing_file_is_protected_without_overwrite(tmp_path):
    official, discovery = event_fixture()
    input_path = tmp_path / "events.json"
    output_dir = tmp_path / "events"
    input_path.write_text(json.dumps({"events": [official, discovery]}), encoding="utf-8")

    first = run_migration(input_path, output_dir)
    assert first.returncode == 0, first.stderr
    target = output_dir / "2026" / "bitcoin-summit-2026.md"
    expected = target.read_bytes()
    target.write_bytes(expected + b"local edit\n")

    refused = run_migration(input_path, output_dir)

    assert refused.returncode != 0
    assert "differs" in refused.stderr
    assert target.read_bytes() == expected + b"local edit\n"

    overwritten = run_migration(input_path, output_dir, "--overwrite")

    assert overwritten.returncode == 0, overwritten.stderr
    assert target.read_bytes() == expected
