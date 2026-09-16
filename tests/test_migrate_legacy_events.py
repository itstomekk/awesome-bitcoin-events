import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "migrate_legacy_events.py"


class MigrateLegacyEventsTests(unittest.TestCase):
    def run_migration(self, legacy_payload):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            input_path = directory / "legacy-events.json"
            output_path = directory / "events.json"
            input_path.write_text(json.dumps(legacy_payload), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--input",
                    str(input_path),
                    "--output",
                    str(output_path),
                    "--generated-at",
                    "2026-09-16T18:10:00Z",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            return json.loads(output_path.read_text(encoding="utf-8")), result

    def test_migrates_legacy_records_without_losing_original_fields(self):
        output, result = self.run_migration(
            {
                "year": 2025,
                "updated": "2025-01-01",
                "events": [
                    {
                        "id": 27,
                        "name": "Bitcoin Filmfest 2025",
                        "dates": "May 23-25",
                        "startDate": "2025-05-23",
                        "endDate": "2025-05-25",
                        "url": "https://bitcoinfilmfest.com/",
                        "location": "Warsaw",
                        "country": "Poland",
                        "countryCode": "pl",
                        "region": "Europe",
                        "image": None,
                        "description": "Legacy description",
                    }
                ],
            }
        )

        self.assertEqual(result.returncode, 0)
        self.assertEqual(output["schema_version"], "event-dataset-1.0")
        self.assertEqual(output["generated_at"], "2026-09-16T18:10:00Z")
        self.assertEqual(output["records_total"], 1)
        event = output["events"][0]
        self.assertEqual(event["id"], "evt-bitcoin-filmfest-2025-2025-05-23-warsaw")
        self.assertEqual(event["title"], "Bitcoin Filmfest 2025")
        self.assertEqual(event["dates"], {
            "start": "2025-05-23",
            "end": "2025-05-25",
            "timezone": None,
            "precision": "day",
        })
        self.assertEqual(event["location"]["city"], "Warsaw")
        self.assertEqual(event["location"]["country_code"], "PL")
        self.assertEqual(event["lifecycle"]["status"], "past")
        self.assertEqual(event["verification"]["state"], "legacy_imported")
        self.assertEqual(event["links"]["official_url"], "https://bitcoinfilmfest.com/")
        self.assertEqual(event["source_observations"][0]["source_id"], "legacy-repo-2025")
        self.assertEqual(event["source_observations"][0]["legacy_record_id"], 27)
        self.assertEqual(event["legacy_payload"]["region"], "Europe")
        self.assertEqual(event["legacy_payload"]["dates"], "May 23-25")

    def test_rejects_missing_or_invalid_legacy_dates(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            input_path = directory / "legacy-events.json"
            output_path = directory / "events.json"
            input_path.write_text(
                json.dumps({"events": [{"id": 1, "name": "Broken", "startDate": "May 1"}]}),
                encoding="utf-8",
            )
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--input", str(input_path), "--output", str(output_path)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("startDate", result.stderr)


if __name__ == "__main__":
    unittest.main()
