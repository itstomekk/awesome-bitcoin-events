#!/usr/bin/env python3
"""Migrate the untouched legacy event calendar into the interface-neutral event dataset."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "event-dataset-1.0"
LEGACY_SOURCE_ID = "legacy-repo-2025"
CITY_TIMEZONES = {
    "abu dhabi": "Asia/Dubai",
    "amsterdam": "Europe/Amsterdam",
    "atlanta": "America/New_York",
    "berlin": "Europe/Berlin",
    "hong kong": "Asia/Hong_Kong",
    "lugano": "Europe/Zurich",
    "madrid": "Europe/Madrid",
    "miami": "America/New_York",
    "new york": "America/New_York",
    "prague": "Europe/Prague",
    "praha": "Europe/Prague",
    "warsaw": "Europe/Warsaw",
}
COUNTRY_TIMEZONES = {
    "AE": "Asia/Dubai",
    "AT": "Europe/Vienna",
    "AU": "Australia/Sydney",
    "BE": "Europe/Brussels",
    "CH": "Europe/Zurich",
    "CZ": "Europe/Prague",
    "DE": "Europe/Berlin",
    "DK": "Europe/Copenhagen",
    "ES": "Europe/Madrid",
    "FI": "Europe/Helsinki",
    "FR": "Europe/Paris",
    "GB": "Europe/London",
    "HK": "Asia/Hong_Kong",
    "IE": "Europe/Dublin",
    "IN": "Asia/Kolkata",
    "IT": "Europe/Rome",
    "JP": "Asia/Tokyo",
    "NL": "Europe/Amsterdam",
    "NO": "Europe/Oslo",
    "PL": "Europe/Warsaw",
    "PT": "Europe/Lisbon",
    "SE": "Europe/Stockholm",
    "SG": "Asia/Singapore",
    "ZA": "Africa/Johannesburg",
}


def parse_day(value: Any, field: str) -> date:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an ISO date string")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"{field} must be an ISO date (YYYY-MM-DD): {value!r}") from error


def slugify(value: str) -> str:
    ascii_value = value.encode("ascii", "ignore").decode("ascii").lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return normalized or "untitled"


def build_id(record: dict[str, Any], start: date) -> str:
    title = record.get("name")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("name must be a non-empty string")
    city = record.get("location")
    city_part = slugify(city) if isinstance(city, str) and city.strip() else "unknown-location"
    return f"evt-{slugify(title)}-{start.isoformat()}-{city_part}"


def inferred_timezone(city: Any, country_code: str | None) -> str | None:
    if isinstance(city, str):
        normalized = unicodedata.normalize("NFKD", city).encode("ascii", "ignore").decode("ascii").strip().lower()
        if normalized in CITY_TIMEZONES:
            return CITY_TIMEZONES[normalized]
    return COUNTRY_TIMEZONES.get(country_code or "")


def inferred_delivery_mode(city: Any) -> str:
    if isinstance(city, str) and city.strip().lower() in {"online", "virtual", "remote", "digital"}:
        return "online"
    if isinstance(city, str) and city.strip():
        return "in_person"
    return "unknown"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def migrate_event(record: dict[str, Any], legacy_metadata: dict[str, Any], generated_at: str) -> dict[str, Any]:
    start = parse_day(record.get("startDate"), "startDate")
    end = parse_day(record.get("endDate"), "endDate")
    if end < start:
        raise ValueError(f"endDate must not precede startDate for {record.get('name', '<unnamed>')!r}")

    title = record["name"].strip()
    generated_day = parse_day(generated_at[:10], "generated_at")
    country_code = record.get("countryCode")
    if isinstance(country_code, str) and country_code.strip():
        country_code = country_code.strip().upper()
    else:
        country_code = None

    legacy_source_updated_at = legacy_metadata.get("updated")
    if legacy_source_updated_at is not None and not isinstance(legacy_source_updated_at, str):
        raise ValueError("updated must be a string when present")

    return {
        "id": build_id(record, start),
        "title": title,
        "series": None,
        "dates": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "timezone": inferred_timezone(record.get("location"), country_code),
            "precision": "day",
        },
        "location": {
            "venue": None,
            "city": record.get("location"),
            "region": record.get("region"),
            "country": record.get("country"),
            "country_code": country_code,
            "latitude": None,
            "longitude": None,
            "coordinates_precision": None,
        },
        "classification": {
            "event_type": None,
            "topics": [],
            "bitcoin_relevance": "bitcoin_focused",
            "delivery_mode": inferred_delivery_mode(record.get("location")),
        },
        "organizer": {"name": None, "urls": []},
        "links": {
            "official_url": record.get("url"),
            "registration_url": None,
            "livestream_url": None,
            "social_urls": [],
        },
        "description": record.get("description"),
        "media": {"image_url": record.get("image")},
        "lifecycle": {
            "status": "past" if start < generated_day else "unknown",
            "published": None,
            "cancelled": False,
        },
        "verification": {
            "state": "legacy_imported",
            "confidence": "unverified",
            "last_verified_at": None,
            "notes": "Migrated without changing the legacy record. Verify against an official current event page before using as a future listing.",
        },
        "source_observations": [
            {
                "source_id": LEGACY_SOURCE_ID,
                "source_url": "events.json",
                "event_url": record.get("url"),
                "access_method": "repository_json",
                "observed_at": generated_at,
                "reported_at": legacy_source_updated_at,
                "legacy_record_id": record.get("id"),
                "fields_observed": sorted(record.keys()),
            }
        ],
        "aliases": [],
        "legacy_payload": record,
        "legacy_dataset": {
            "year": legacy_metadata.get("year"),
            "updated": legacy_source_updated_at,
        },
    }


def migrate_dataset(payload: dict[str, Any], generated_at: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("legacy dataset must be a JSON object")
    records = payload.get("events")
    if not isinstance(records, list):
        raise ValueError("events must be a JSON array")

    metadata = {"year": payload.get("year"), "updated": payload.get("updated")}
    events = [migrate_event(record, metadata, generated_at) for record in records]
    ids = [event["id"] for event in events]
    if len(ids) != len(set(ids)):
        raise ValueError("legacy records generated duplicate canonical ids")

    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "records_total": len(events),
        "dataset_scope": "legacy-import",
        "events": events,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--generated-at", default=utc_now())
    args = parser.parse_args()

    try:
        generated_at = args.generated_at
        datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        result = migrate_dataset(payload, generated_at)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"migration failed: {error}", file=sys.stderr)
        return 1

    print(f"migrated {result['records_total']} legacy events to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
