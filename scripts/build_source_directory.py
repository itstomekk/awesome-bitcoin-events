#!/usr/bin/env python3
"""Build the public, interface-neutral source directory from registry and Notion inventory."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_url(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("url must be a non-empty string")
    parsed = urlsplit(value.strip())
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"url must be absolute: {value!r}")
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, ""))


def slugify(value: str) -> str:
    ascii_value = value.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "unnamed"


def list_value(value: Any) -> list[str]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str) and item]


def role_from_notion_tags(tags: list[str]) -> str:
    if any("social noise" in tag for tag in tags):
        return "community"
    if any("info base" in tag for tag in tags):
        return "editorial"
    return "discovery"


def quality_score(role: str, reviewed: bool) -> int:
    if not reviewed:
        return 1
    return {"canonical": 5, "community": 4, "editorial": 3, "discovery": 2, "dead_or_archived": 1}.get(role, 1)


def source_id(name: str, normalized_url: str) -> str:
    suffix = hashlib.sha256(normalized_url.encode("utf-8")).hexdigest()[:8]
    return f"source-{slugify(name)}-{suffix}"


def empty_source(identifier: str, name: str, homepage: str) -> dict[str, Any]:
    return {
        "id": identifier,
        "name": name,
        "urls": {"homepage": homepage, "event_feed_url": None},
        "source_role": "discovery",
        "source_type": "unreviewed",
        "geographic_coverage": None,
        "topic_coverage": [],
        "languages": [],
        "access": {"adapter": "not_reviewed", "status": "unreviewed"},
        "monitoring": {
            "status": "unreviewed",
            "cadence_days": None,
            "last_checked": None,
            "decision_reason": None,
        },
        "quality": {"score": 1, "ratings": [], "notes": None},
        "provenance": [],
        "extensions": {"notion_type_tags": []},
    }


def add_registry_sources(result: dict[str, dict[str, Any]], registry: dict[str, Any]) -> int:
    sources = registry.get("sources")
    if not isinstance(sources, list):
        raise ValueError("registry sources must be an array")
    for item in sources:
        if not isinstance(item, dict):
            raise ValueError("registry source must be an object")
        identifier = item.get("id")
        name = item.get("name")
        if not isinstance(identifier, str) or not identifier:
            raise ValueError("registry source id must be a non-empty string")
        if not isinstance(name, str) or not name:
            raise ValueError("registry source name must be a non-empty string")
        homepage = normalize_url(item.get("url"))
        source = result.setdefault(homepage, empty_source(identifier, name, homepage))
        source["id"] = identifier
        source["name"] = name
        source["urls"]["homepage"] = homepage
        source["urls"]["event_feed_url"] = item.get("feed_url")
        source["source_role"] = item.get("role", "discovery")
        source["source_type"] = item.get("type", "unreviewed")
        source["quality"]["score"] = quality_score(source["source_role"], True)
        source["geographic_coverage"] = item.get("geo")
        source["topic_coverage"] = list_value(item.get("topics"))
        source["access"] = {"adapter": item.get("adapter", "not_reviewed"), "status": "configured"}
        monitoring = item.get("monitoring") if isinstance(item.get("monitoring"), dict) else {}
        source["monitoring"] = {
            "status": monitoring.get("status", "unreviewed"),
            "cadence_days": monitoring.get("cadence_days"),
            "last_checked": monitoring.get("last_checked"),
            "decision_reason": monitoring.get("decision_reason"),
        }
        source["quality"]["notes"] = item.get("notes")
        source["provenance"].append(
            {
                "kind": "source_registry",
                "record_ref": "sources/registry.json",
                "registry_metadata": {
                    "priority": item.get("priority"),
                    "topics": list_value(item.get("topics")),
                },
            }
        )
    return len(sources)


def add_notion_sources(result: dict[str, dict[str, Any]], notion_export: dict[str, Any]) -> int:
    rows = notion_export.get("rows")
    if not isinstance(rows, list):
        raise ValueError("notion rows must be an array")
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("notion source row must be an object")
        name = row.get("name", row.get("Name"))
        homepage_value = row.get("source_url", row.get("callink"))
        if not isinstance(name, str) or not name.strip():
            raise ValueError("notion source name must be a non-empty string")
        homepage = normalize_url(homepage_value)
        tags = list_value(row.get("type_tags", row.get("Type")))
        languages = list_value(row.get("languages", row.get("Language")))
        source = result.setdefault(homepage, empty_source(source_id(name, homepage), name, homepage))
        source["languages"] = sorted(set(source["languages"]).union(languages))
        source["extensions"]["notion_type_tags"] = sorted(set(source["extensions"]["notion_type_tags"]).union(tags))
        if source["source_type"] == "unreviewed":
            source["source_role"] = role_from_notion_tags(tags)
            source["quality"]["score"] = quality_score(source["source_role"], False)
        rating = row.get("quality_rating", row.get("How good is it"))
        if isinstance(rating, str) and rating and rating not in source["quality"]["ratings"]:
            source["quality"]["ratings"].append(rating)
        source["provenance"].append(
            {
                "kind": "notion_source_inventory",
                "record_ref": row.get("notion_record_id", row.get("id")),
                "notion_metadata": {
                    "type_tags": tags,
                    "quality_rating": rating if isinstance(rating, str) else None,
                    "last_edited_at": row.get("last_edited_at", row.get("Last edited time")),
                },
            }
        )
    return len(rows)


def add_scan_sources(result: dict[str, dict[str, Any]], scan_exports: list[tuple[dict[str, Any], str]]) -> int:
    total = 0
    for scan, scan_ref in scan_exports:
        sources = scan.get("sources")
        if not isinstance(sources, list):
            raise ValueError("scan sources must be an array")
        observed_urls: dict[str, set[str]] = {}
        for candidate in scan.get("candidates", []):
            if not isinstance(candidate, dict):
                continue
            for observation in candidate.get("source_observations", []):
                if not isinstance(observation, dict):
                    continue
                source_id = observation.get("source_id")
                source_url = observation.get("source_url")
                if isinstance(source_id, str) and isinstance(source_url, str) and source_url:
                    observed_urls.setdefault(source_id, set()).add(normalize_url(source_url))
        for item in sources:
            if not isinstance(item, dict) or not isinstance(item.get("source_id"), str):
                continue
            total += 1
            source_id = item["source_id"]
            urls = sorted(observed_urls.get(source_id, set()))
            if not urls:
                continue
            homepage = urls[0]
            source = result.setdefault(homepage, empty_source(source_id, source_id.replace("-", " ").title(), homepage))
            source["source_role"] = "canonical"
            source["source_type"] = "review_scan"
            source["access"] = {"adapter": "review_scan", "status": item.get("access_method", "observed")}
            source["quality"]["score"] = quality_score("canonical", True)
            source["monitoring"] = {
                "status": "review_pending",
                "cadence_days": 7,
                "last_checked": scan.get("reviewed_at"),
                "decision_reason": "Official source observed during automated event verification; cadence remains provisional.",
            }
            source["provenance"].append(
                {
                    "kind": "review_scan",
                    "record_ref": scan_ref,
                    "scan_source_id": source_id,
                    "observed_urls": urls,
                }
            )
    return total


def build_directory(registry: dict[str, Any], notion_export: dict[str, Any], generated_at: str, scan_exports: list[tuple[dict[str, Any], str]] | None = None) -> dict[str, Any]:
    datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
    sources_by_url: dict[str, dict[str, Any]] = {}
    registry_total = add_registry_sources(sources_by_url, registry)
    notion_total = add_notion_sources(sources_by_url, notion_export)
    scan_total = add_scan_sources(sources_by_url, scan_exports or [])
    sources = sorted(sources_by_url.values(), key=lambda source: (source["name"].lower(), source["id"]))
    return {
        "schema_version": "source-dataset-1.0",
        "generated_at": generated_at,
        "source_records_total": registry_total + notion_total + scan_total,
        "unique_sources_total": len(sources),
        "sources": sources,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", type=Path, required=True)
    parser.add_argument("--notion-export", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--scan", type=Path, action="append", default=[])
    parser.add_argument("--generated-at", default=utc_now())
    args = parser.parse_args()
    try:
        registry = json.loads(args.registry.read_text(encoding="utf-8"))
        notion_export = json.loads(args.notion_export.read_text(encoding="utf-8"))
        scan_exports = [(json.loads(path.read_text(encoding="utf-8")), str(path)) for path in args.scan]
        result = build_directory(registry, notion_export, args.generated_at, scan_exports)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"source directory build failed: {error}", file=sys.stderr)
        return 1
    print(f"mapped {result['source_records_total']} source records into {result['unique_sources_total']} unique sources")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
