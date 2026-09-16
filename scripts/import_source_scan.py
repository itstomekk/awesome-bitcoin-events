#!/usr/bin/env python3
"""Import a reviewed source scan as provenance-preserving candidate event records."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_day(value: Any, field: str) -> date:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an ISO date string")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"{field} must be an ISO date (YYYY-MM-DD): {value!r}") from error


def slugify(value: str) -> str:
    ascii_value = value.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "untitled"


def canonical_id(title: str, start: date, city: str | None) -> str:
    location = slugify(city) if isinstance(city, str) and city.strip() else "unknown-location"
    return f"evt-{slugify(title)}-{start.isoformat()}-{location}"


def event_merge_key(event: dict[str, Any]) -> tuple[str, str, str, str] | None:
    title = event.get("title")
    dates = event.get("dates")
    location = event.get("location")
    if not isinstance(title, str) or not isinstance(dates, dict) or not isinstance(location, dict):
        return None
    start = dates.get("start")
    end = dates.get("end")
    city = location.get("city")
    if not all(isinstance(value, str) and value for value in (start, end, city)):
        return None
    title_without_year = re.sub(r"\b20\d{2}\b", "", title)
    return (slugify(title_without_year), start, end, slugify(city))


VERIFICATION_STATE_RANK = {
    "legacy_imported": 0,
    "discovery_only": 1,
    "needs_review": 1,
    "official_page_seen": 2,
}
CONFIDENCE_RANK = {"unverified": 0, "low": 1, "medium": 2, "high": 3}


def normalize_url(value: str) -> str:
    parsed = urlsplit(value)
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, ""))


def source_ids_by_url(source_directory: dict[str, Any] | None) -> dict[str, str]:
    if not isinstance(source_directory, dict):
        return {}
    lookup: dict[str, str] = {}
    source_ids_by_host: dict[str, set[str]] = {}
    for source in source_directory.get("sources", []):
        if not isinstance(source, dict) or not isinstance(source.get("id"), str):
            continue
        urls = source.get("urls")
        if not isinstance(urls, dict):
            continue
        for value in urls.values():
            if isinstance(value, str) and value:
                lookup[normalize_url(value)] = source["id"]
                hostname = urlsplit(value).hostname
                if hostname:
                    source_ids_by_host.setdefault(hostname.lower(), set()).add(source["id"])
    for hostname, source_ids in source_ids_by_host.items():
        if len(source_ids) == 1:
            lookup[f"host:{hostname}"] = next(iter(source_ids))
    return lookup


def candidate_observations(candidate: dict[str, Any], source_access: dict[str, str], source_lookup: dict[str, str]) -> list[dict[str, Any]]:
    observations = candidate.get("source_observations")
    if not isinstance(observations, list) or not observations:
        raise ValueError(f"candidate {candidate.get('title', '<unnamed>')!r} has no source observations")
    output = []
    for observation in observations:
        if not isinstance(observation, dict):
            raise ValueError("source observation must be an object")
        source_id = observation.get("source_id")
        source_url = observation.get("source_url")
        observed_at = observation.get("observed_at")
        if not all(isinstance(value, str) and value for value in (source_id, source_url, observed_at)):
            raise ValueError("source observation requires source_id, source_url, and observed_at")
        datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
        hostname = urlsplit(source_url).hostname
        canonical_source_id = source_lookup.get(normalize_url(source_url))
        if canonical_source_id is None and hostname:
            canonical_source_id = source_lookup.get(f"host:{hostname.lower()}")
        if canonical_source_id is None:
            canonical_source_id = source_id
        output.append(
            {
                "source_id": canonical_source_id,
                "reported_source_id": source_id,
                "source_url": source_url,
                "event_url": observation.get("event_url"),
                "access_method": source_access.get(source_id, "unknown"),
                "observed_at": observed_at,
                "raw_excerpt": observation.get("raw_excerpt"),
            }
        )
    return output


def candidate_to_event(candidate: dict[str, Any], cutoff: date, as_of: date, source_access: dict[str, str], source_lookup: dict[str, str], scan_schema: str) -> dict[str, Any]:
    title = candidate.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("candidate title must be a non-empty string")
    start = parse_day(candidate.get("start_date"), "start_date")
    end = parse_day(candidate.get("end_date"), "end_date")
    if end < start:
        raise ValueError(f"candidate {title!r} has end_date before start_date")
    if end < cutoff:
        raise ValueError(f"candidate {title!r} ended before scan cutoff {cutoff.isoformat()}")
    location = candidate.get("location")
    if not isinstance(location, dict):
        raise ValueError(f"candidate {title!r} location must be an object")
    country_code = location.get("country_code")
    if isinstance(country_code, str) and country_code.strip():
        country_code = country_code.strip().upper()
    else:
        country_code = None
    observations = candidate_observations(candidate, source_access, source_lookup)
    topics = candidate.get("topics")
    if not isinstance(topics, list):
        topics = []
    if any(not isinstance(topic, str) for topic in topics):
        raise ValueError(f"candidate {title!r} topics must be strings")
    official_url = candidate.get("official_url")
    verification_state = candidate.get("verification_state", "discovery_only")
    confidence = candidate.get("confidence", "low")
    if verification_state == "official_page_seen" and not official_url:
        verification_state = "needs_review"
        confidence = "low"
    elif verification_state == "discovery_only" and not official_url:
        distinct_sources = {observation["source_id"] for observation in observations}
        if len(distinct_sources) >= 2:
            verification_state = "needs_review"
            confidence = "medium" if CONFIDENCE_RANK.get(confidence, 0) < CONFIDENCE_RANK["medium"] else confidence
    last_verified_at = None
    if verification_state == "official_page_seen":
        last_verified_at = max(observation["observed_at"] for observation in observations)

    return {
        "id": canonical_id(title, start, location.get("city")),
        "title": title.strip(),
        "series": candidate.get("series"),
        "dates": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "timezone": candidate.get("timezone"),
            "precision": candidate.get("date_precision", "day"),
        },
        "location": {
            "venue": location.get("venue"),
            "city": location.get("city"),
            "region": location.get("region"),
            "country": location.get("country"),
            "country_code": country_code,
            "latitude": None,
            "longitude": None,
            "coordinates_precision": None,
        },
        "classification": {
            "event_type": candidate.get("event_type"),
            "topics": sorted(set(topics)),
            "bitcoin_relevance": "bitcoin_focused",
        },
        "organizer": {"name": candidate.get("organizer"), "urls": []},
        "links": {
            "official_url": official_url,
            "registration_url": candidate.get("registration_url"),
            "livestream_url": None,
            "social_urls": [],
        },
        "description": candidate.get("description"),
        "media": {"image_url": None},
        "lifecycle": {"status": "past" if end < as_of else "announced", "published": None, "cancelled": False},
        "verification": {
            "state": verification_state,
            "confidence": confidence,
            "last_verified_at": last_verified_at,
            "notes": "Imported from a reviewed discovery scan. Confirm against an organizer-owned page before treating dates as canonical.",
        },
        "source_observations": observations,
        "aliases": [],
        "extensions": {"source_scan": {"schema_version": scan_schema}},
    }


def observation_key(observation: dict[str, Any]) -> tuple[Any, ...]:
    return (observation.get("source_id"), observation.get("source_url"), observation.get("event_url"))


def merge_event(existing: dict[str, Any], incoming: dict[str, Any]) -> None:
    existing_observations = existing.setdefault("source_observations", [])
    existing_keys = {observation_key(item) for item in existing_observations}
    for observation in incoming["source_observations"]:
        if observation_key(observation) not in existing_keys:
            existing_observations.append(observation)
            existing_keys.add(observation_key(observation))
    for group in ("links", "location", "organizer"):
        for key, value in incoming[group].items():
            if existing[group].get(key) is None and value is not None:
                existing[group][key] = value
    if existing.get("description") is None and incoming.get("description") is not None:
        existing["description"] = incoming["description"]
    if existing.get("series") is None and incoming.get("series") is not None:
        existing["series"] = incoming["series"]
    existing_verification = existing["verification"]
    incoming_verification = incoming["verification"]
    if VERIFICATION_STATE_RANK.get(incoming_verification["state"], 0) > VERIFICATION_STATE_RANK.get(existing_verification["state"], 0):
        existing["verification"] = incoming_verification
    elif (
        VERIFICATION_STATE_RANK.get(incoming_verification["state"], 0) == VERIFICATION_STATE_RANK.get(existing_verification["state"], 0)
        and CONFIDENCE_RANK.get(incoming_verification["confidence"], 0) > CONFIDENCE_RANK.get(existing_verification["confidence"], 0)
    ):
        existing_verification["confidence"] = incoming_verification["confidence"]


def import_scan(dataset: dict[str, Any], scan: dict[str, Any], generated_at: str, source_directory: dict[str, Any] | None = None) -> dict[str, Any]:
    if dataset.get("schema_version") != "event-dataset-1.0":
        raise ValueError("dataset schema_version must be event-dataset-1.0")
    if scan.get("schema_version") != "research-source-scan-1.0":
        raise ValueError("scan schema_version must be research-source-scan-1.0")
    generated_datetime = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
    cutoff = parse_day(scan.get("cutoff_date"), "cutoff_date")
    source_access = {
        source["source_id"]: source.get("access_method", "unknown")
        for source in scan.get("sources", [])
        if isinstance(source, dict) and isinstance(source.get("source_id"), str)
    }
    source_lookup = source_ids_by_url(source_directory)
    records = dataset.get("events")
    if not isinstance(records, list):
        raise ValueError("dataset events must be an array")
    by_id = {record.get("id"): record for record in records if isinstance(record, dict) and isinstance(record.get("id"), str)}
    by_merge_key = {
        event_merge_key(record): record
        for record in records
        if isinstance(record, dict) and event_merge_key(record) is not None
    }
    candidates = scan.get("candidates")
    if not isinstance(candidates, list):
        raise ValueError("scan candidates must be an array")
    for candidate in candidates:
        if not isinstance(candidate, dict):
            raise ValueError("scan candidate must be an object")
        event = candidate_to_event(candidate, cutoff, generated_datetime.date(), source_access, source_lookup, scan["schema_version"])
        existing = by_id.get(event["id"]) or by_merge_key.get(event_merge_key(event))
        if existing is not None:
            merge_event(existing, event)
        else:
            records.append(event)
            by_id[event["id"]] = event
            if event_merge_key(event) is not None:
                by_merge_key[event_merge_key(event)] = event
    records.sort(key=lambda event: (event["dates"]["start"], event["id"]))
    dataset["events"] = records
    dataset["records_total"] = len(records)
    dataset["generated_at"] = generated_at
    dataset["dataset_scope"] = "legacy-import+source-candidates"
    return dataset


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--scan", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--snapshot-output", type=Path)
    parser.add_argument("--source-directory", type=Path)
    parser.add_argument("--generated-at", default=utc_now())
    args = parser.parse_args()
    try:
        dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
        scan = json.loads(args.scan.read_text(encoding="utf-8"))
        source_directory = json.loads(args.source_directory.read_text(encoding="utf-8")) if args.source_directory else None
        result = import_scan(dataset, scan, args.generated_at, source_directory)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        if args.snapshot_output:
            args.snapshot_output.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(args.scan, args.snapshot_output)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"source scan import failed: {error}", file=sys.stderr)
        return 1
    print(f"dataset now has {result['records_total']} events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
