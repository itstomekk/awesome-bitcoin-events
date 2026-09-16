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
