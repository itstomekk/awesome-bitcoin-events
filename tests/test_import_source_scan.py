import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "import_source_scan.py"


class ImportSourceScanTests(unittest.TestCase):
    def run_import(self, dataset, scan, source_directory=None):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            dataset_path = directory / "events.json"
            scan_path = directory / "scan.json"
            output_path = directory / "output.json"
            snapshot_path = directory / "raw" / "scan.json"
            source_directory_path = directory / "sources.json"
            dataset_path.write_text(json.dumps(dataset), encoding="utf-8")
            scan_path.write_text(json.dumps(scan), encoding="utf-8")
            command = [
                sys.executable,
                str(SCRIPT),
                "--dataset",
                str(dataset_path),
                "--scan",
                str(scan_path),
                "--output",
                str(output_path),
                "--snapshot-output",
                str(snapshot_path),
                "--generated-at",
                "2026-09-16T18:10:00Z",
            ]
            if source_directory is not None:
                source_directory_path.write_text(json.dumps(source_directory), encoding="utf-8")
                command.extend(["--source-directory", str(source_directory_path)])
            result = subprocess.run(
                command,
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            return (
                json.loads(output_path.read_text(encoding="utf-8")),
                json.loads(snapshot_path.read_text(encoding="utf-8")),
                result,
            )

    def test_imports_future_discovery_event_and_keeps_raw_scan_snapshot(self):
        dataset = {
            "schema_version": "event-dataset-1.0",
            "generated_at": "2026-09-16T18:00:00Z",
            "records_total": 0,
            "dataset_scope": "legacy-import",
            "events": [],
        }
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "community-calendar", "access_method": "static_html"}],
            "candidates": [
                {
                    "title": "Bitcoin Example 2026",
                    "series": "Bitcoin Example",
                    "start_date": "2026-10-01",
                    "end_date": "2026-10-03",
                    "date_precision": "day",
                    "timezone": None,
                    "event_type": "conference",
                    "topics": ["bitcoin", "developer"],
                    "description": "A test event.",
                    "organizer": "Example Org",
                    "official_url": None,
                    "registration_url": "https://tickets.example.org/bitcoin-example",
                    "location": {
                        "venue": "Example Hall",
                        "city": "Example City",
                        "region": "Example Region",
                        "country": "Exampleland",
                        "country_code": "ex",
                    },
                    "source_observations": [
                        {
                            "source_id": "community-calendar",
                            "source_url": "https://calendar.example.org/events",
                            "event_url": "https://calendar.example.org/events/bitcoin-example",
                            "observed_at": "2026-09-16T18:05:00Z",
                            "raw_excerpt": "Bitcoin Example 2026, Oct 1-3",
                        }
                    ],
                    "verification_state": "discovery_only",
                    "confidence": "low",
                }
            ],
        }

        output, snapshot, result = self.run_import(dataset, scan)

        self.assertEqual(result.returncode, 0)
        self.assertEqual(snapshot, scan)
        self.assertEqual(output["records_total"], 1)
        event = output["events"][0]
        self.assertEqual(event["id"], "evt-bitcoin-example-2026-2026-10-01-example-city")
        self.assertEqual(event["lifecycle"]["status"], "announced")
        self.assertEqual(event["verification"]["state"], "discovery_only")
        self.assertEqual(event["links"]["official_url"], None)
        self.assertEqual(event["location"]["country_code"], "EX")
        self.assertEqual(event["source_observations"][0]["access_method"], "static_html")
        self.assertEqual(event["extensions"]["source_scan"]["schema_version"], "research-source-scan-1.0")

    def test_downgrades_unsupported_official_claim_to_needs_review(self):
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 0, "dataset_scope": "legacy-import", "events": []}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "directory", "access_method": "static_html"}],
            "candidates": [
                {
                    "title": "Unsupported Official Claim",
                    "start_date": "2026-10-01",
                    "end_date": "2026-10-01",
                    "location": {"city": "Anywhere"},
                    "source_observations": [{"source_id": "directory", "source_url": "https://example.org", "event_url": None, "observed_at": "2026-09-16T18:05:00Z", "raw_excerpt": "Example"}],
                    "verification_state": "official_page_seen",
                    "confidence": "medium",
                }
            ],
        }

        output, _, _ = self.run_import(dataset, scan)

        self.assertEqual(output["events"][0]["verification"]["state"], "needs_review")
        self.assertEqual(output["events"][0]["verification"]["confidence"], "low")

    def test_marks_multi_source_discovery_without_official_url_for_review(self):
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 0, "dataset_scope": "legacy-import", "events": []}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "directory-a", "access_method": "static_html"}, {"source_id": "directory-b", "access_method": "static_html"}],
            "candidates": [{"title": "Corroborated Directory Event", "start_date": "2026-10-01", "end_date": "2026-10-01", "location": {"city": "Anywhere"}, "source_observations": [{"source_id": "directory-a", "source_url": "https://a.example.org", "event_url": None, "observed_at": "2026-09-16T18:05:00Z", "raw_excerpt": "A"}, {"source_id": "directory-b", "source_url": "https://b.example.org", "event_url": None, "observed_at": "2026-09-16T18:06:00Z", "raw_excerpt": "B"}], "verification_state": "discovery_only", "confidence": "low"}],
        }

        output, _, _ = self.run_import(dataset, scan)

        self.assertEqual(output["events"][0]["verification"]["state"], "needs_review")
        self.assertEqual(output["events"][0]["verification"]["confidence"], "medium")

    def test_resolves_source_observation_to_source_directory_id(self):
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 0, "dataset_scope": "legacy-import", "events": []}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "raw-calendar-id", "access_method": "static_html"}],
            "candidates": [{"title": "Resolved Source", "start_date": "2026-10-01", "end_date": "2026-10-01", "location": {"city": "Anywhere"}, "source_observations": [{"source_id": "raw-calendar-id", "source_url": "https://calendar.example.org/events/", "event_url": None, "observed_at": "2026-09-16T18:05:00Z", "raw_excerpt": "Example"}]}],
        }
        source_directory = {
            "sources": [
                {"id": "canonical-calendar", "urls": {"homepage": "https://calendar.example.org/events", "event_feed_url": None}}
            ]
        }

        output, _, _ = self.run_import(dataset, scan, source_directory)

        observation = output["events"][0]["source_observations"][0]
        self.assertEqual(observation["source_id"], "canonical-calendar")
        self.assertEqual(observation["reported_source_id"], "raw-calendar-id")

    def test_resolves_event_page_on_a_unique_source_domain(self):
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 0, "dataset_scope": "legacy-import", "events": []}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "raw-calendar-id", "access_method": "static_html"}],
            "candidates": [{"title": "Resolved Detail Page", "start_date": "2026-10-01", "end_date": "2026-10-01", "location": {"city": "Anywhere"}, "source_observations": [{"source_id": "raw-calendar-id", "source_url": "https://calendar.example.org/events/detail-1", "event_url": None, "observed_at": "2026-09-16T18:05:00Z", "raw_excerpt": "Example"}]}],
        }
        source_directory = {"sources": [{"id": "canonical-calendar", "urls": {"homepage": "https://calendar.example.org/events", "event_feed_url": None}}]}

        output, _, _ = self.run_import(dataset, scan, source_directory)

        self.assertEqual(output["events"][0]["source_observations"][0]["source_id"], "canonical-calendar")

    def test_merges_official_confirmation_into_existing_discovery_event(self):
        existing = {
            "id": "evt-confirmable-event-2026-10-01-atlanta",
            "title": "Confirmable Event",
            "series": None,
            "dates": {"start": "2026-10-01", "end": "2026-10-02", "timezone": None, "precision": "day"},
            "location": {"venue": None, "city": "Atlanta", "region": None, "country": "United States", "country_code": "US", "latitude": None, "longitude": None, "coordinates_precision": None},
            "classification": {"event_type": "conference", "topics": ["bitcoin"], "bitcoin_relevance": "bitcoin_focused"},
            "organizer": {"name": None, "urls": []},
            "links": {"official_url": None, "registration_url": None, "livestream_url": None, "social_urls": []},
            "description": None,
            "media": {"image_url": None},
            "lifecycle": {"status": "announced", "published": None, "cancelled": False},
            "verification": {"state": "discovery_only", "confidence": "low", "last_verified_at": None, "notes": "Directory listing only."},
            "source_observations": [{"source_id": "directory", "source_url": "https://directory.example.org", "event_url": None, "access_method": "static_html", "observed_at": "2026-09-16T00:00:00Z", "raw_excerpt": "Listing"}],
            "aliases": [],
        }
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 1, "dataset_scope": "legacy-import+source-candidates", "events": [existing]}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "official-organizer", "access_method": "static_html"}],
            "candidates": [{"title": "Confirmable Event", "start_date": "2026-10-01", "end_date": "2026-10-02", "location": {"city": "Atlanta", "country": "United States", "country_code": "US"}, "official_url": "https://official.example.org/event", "organizer": "Official Organizer", "source_observations": [{"source_id": "official-organizer", "source_url": "https://official.example.org/event", "event_url": "https://official.example.org/event", "observed_at": "2026-09-16T18:05:00Z", "raw_excerpt": "Official event page"}], "verification_state": "official_page_seen", "confidence": "high"}],
        }

        output, _, _ = self.run_import(dataset, scan)

        event = output["events"][0]
        self.assertEqual(event["verification"]["state"], "official_page_seen")
        self.assertEqual(event["verification"]["confidence"], "high")
        self.assertEqual(event["links"]["official_url"], "https://official.example.org/event")
        self.assertEqual(event["organizer"]["name"], "Official Organizer")
        self.assertEqual(len(event["source_observations"]), 2)

    def test_marks_historical_confirmation_as_past_and_records_verification_time(self):
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 0, "dataset_scope": "legacy-import", "events": []}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-06-01",
            "sources": [{"source_id": "official-organizer", "access_method": "static_html"}],
            "candidates": [{"title": "Historical Confirmation", "start_date": "2026-06-10", "end_date": "2026-06-12", "location": {"city": "Prague", "country": "Czech Republic", "country_code": "CZ"}, "official_url": "https://official.example.org/historical", "source_observations": [{"source_id": "official-organizer", "source_url": "https://official.example.org/historical", "event_url": "https://official.example.org/historical", "observed_at": "2026-06-01T12:00:00Z", "raw_excerpt": "Official historical event page"}], "verification_state": "official_page_seen", "confidence": "high"}],
        }

        output, _, _ = self.run_import(dataset, scan)

        event = output["events"][0]
        self.assertEqual(event["lifecycle"]["status"], "past")
        self.assertEqual(event["verification"]["last_verified_at"], "2026-06-01T12:00:00Z")

    def test_merges_year_suffix_variant_using_date_and_city(self):
        existing = {
            "id": "evt-plan-forum-lugano-2026-2026-10-23-lugano",
            "title": "Plan ₿ Forum Lugano 2026",
            "series": None,
            "dates": {"start": "2026-10-23", "end": "2026-10-24", "timezone": None, "precision": "day"},
            "location": {"venue": None, "city": "Lugano", "region": None, "country": "Switzerland", "country_code": "CH", "latitude": None, "longitude": None, "coordinates_precision": None},
            "classification": {"event_type": "conference", "topics": ["Bitcoin"], "bitcoin_relevance": "bitcoin_focused"},
            "organizer": {"name": None, "urls": []},
            "links": {"official_url": None, "registration_url": None, "livestream_url": None, "social_urls": []},
            "description": None,
            "media": {"image_url": None},
            "lifecycle": {"status": "announced", "published": None, "cancelled": False},
            "verification": {"state": "discovery_only", "confidence": "medium", "last_verified_at": None, "notes": "Directory listing only."},
            "source_observations": [{"source_id": "directory", "source_url": "https://directory.example.org", "event_url": None, "access_method": "static_html", "observed_at": "2026-09-16T00:00:00Z", "raw_excerpt": "Listing"}],
            "aliases": [],
        }
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 1, "dataset_scope": "legacy-import+source-candidates", "events": [existing]}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [{"source_id": "lugano-plan-b", "access_method": "static_html"}],
            "candidates": [{"title": "Plan ₿ Forum Lugano", "series": "Plan ₿ Forum", "start_date": "2026-10-23", "end_date": "2026-10-24", "location": {"city": "Lugano", "country": "Switzerland", "country_code": "CH"}, "official_url": "https://planb.lugano.ch/planb-forum/", "source_observations": [{"source_id": "lugano-plan-b", "source_url": "https://planb.lugano.ch/planb-forum", "event_url": "https://planb.lugano.ch/planb-forum", "observed_at": "2026-09-16T18:05:00Z", "raw_excerpt": "Official event page"}], "verification_state": "official_page_seen", "confidence": "high"}],
        }

        output, _, _ = self.run_import(dataset, scan)

        self.assertEqual(output["records_total"], 1)
        self.assertEqual(output["events"][0]["verification"]["state"], "official_page_seen")
        self.assertEqual(output["events"][0]["links"]["official_url"], "https://planb.lugano.ch/planb-forum/")
        self.assertEqual(len(output["events"][0]["source_observations"]), 2)

    def test_rejects_candidate_that_ended_before_scan_cutoff(self):
        dataset = {"schema_version": "event-dataset-1.0", "generated_at": "2026-09-16T18:00:00Z", "records_total": 0, "dataset_scope": "legacy-import", "events": []}
        scan = {
            "schema_version": "research-source-scan-1.0",
            "cutoff_date": "2026-09-16",
            "sources": [],
            "candidates": [
                {
                    "title": "Stale Event",
                    "start_date": "2026-09-01",
                    "end_date": "2026-09-02",
                    "location": {"city": "Anywhere"},
                    "source_observations": [],
                }
            ],
        }
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            dataset_path = directory / "events.json"
            scan_path = directory / "scan.json"
            output_path = directory / "output.json"
            dataset_path.write_text(json.dumps(dataset), encoding="utf-8")
            scan_path.write_text(json.dumps(scan), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--dataset", str(dataset_path), "--scan", str(scan_path), "--output", str(output_path)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ended before", result.stderr)


if __name__ == "__main__":
    unittest.main()
