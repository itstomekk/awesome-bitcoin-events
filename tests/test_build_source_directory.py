import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build_source_directory.py"


class BuildSourceDirectoryTests(unittest.TestCase):
    def run_builder(self, registry, notion_rows, scan=None):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            registry_path = directory / "registry.json"
            notion_path = directory / "notion.json"
            output_path = directory / "sources.json"
            scan_path = directory / "scan.json"
            registry_path.write_text(json.dumps(registry), encoding="utf-8")
            notion_path.write_text(json.dumps({"rows": notion_rows}), encoding="utf-8")
            command = [
                sys.executable,
                str(SCRIPT),
                "--registry",
                str(registry_path),
                "--notion-export",
                str(notion_path),
                "--output",
                str(output_path),
                "--generated-at",
                "2026-09-16T18:10:00Z",
            ]
            if scan is not None:
                scan_path.write_text(json.dumps(scan), encoding="utf-8")
                command.extend(["--scan", str(scan_path)])
            result = subprocess.run(
                command,
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            return json.loads(output_path.read_text(encoding="utf-8")), result

    def test_merges_matching_registry_and_notion_source_without_exposing_private_tracking(self):
        output, result = self.run_builder(
            {
                "sources": [
                    {
                        "id": "example-events",
                        "name": "Example Events",
                        "url": "https://example.org/events",
                        "type": "static_html",
                        "role": "canonical",
                        "adapter": "pending",
                        "priority": 2,
                        "geo": "global",
                        "topics": ["conference"],
                        "feed_url": "https://example.org/feed.ics",
                        "notes": "Public source note.",
                        "monitoring": {"status": "healthy", "cadence_days": 7},
                    }
                ]
            },
            [
                {
                    "id": "notion-row-1",
                    "Name": "Example Events old name",
                    "callink": "https://example.org/events/",
                    "Type": '["BTC | info & events"]',
                    "Language": '["EN", "PL"]',
                    "How good is it": "★★★★",
                    "Last edited time": "2026-09-10 12:00:00Z",
                    "Comment": "Private operational comment that must not ship.",
                    "Submissions via contact": "internal account notes",
                }
            ],
        )

        self.assertEqual(result.returncode, 0)
        self.assertEqual(output["schema_version"], "source-dataset-1.0")
        self.assertEqual(output["source_records_total"], 2)
        self.assertEqual(output["unique_sources_total"], 1)
        source = output["sources"][0]
        self.assertEqual(source["id"], "example-events")
        self.assertEqual(source["source_role"], "canonical")
        self.assertEqual(source["urls"]["homepage"], "https://example.org/events")
        self.assertEqual(source["urls"]["event_feed_url"], "https://example.org/feed.ics")
        self.assertEqual(source["quality"]["score"], 5)
        self.assertEqual(source["languages"], ["EN", "PL"])
        self.assertEqual(source["monitoring"]["cadence_days"], 7)
        self.assertEqual(len(source["provenance"]), 2)
        notion_provenance = next(item for item in source["provenance"] if item["kind"] == "notion_source_inventory")
        self.assertEqual(notion_provenance["notion_metadata"]["type_tags"], ["BTC | info & events"])
        self.assertNotIn("Comment", json.dumps(output))
        self.assertNotIn("Submissions via contact", json.dumps(output))

    def test_rejects_registry_source_without_url(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            registry_path = directory / "registry.json"
            notion_path = directory / "notion.json"
            output_path = directory / "sources.json"
            registry_path.write_text(json.dumps({"sources": [{"id": "broken", "name": "Broken"}]}), encoding="utf-8")
            notion_path.write_text(json.dumps({"rows": []}), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--registry", str(registry_path), "--notion-export", str(notion_path), "--output", str(output_path)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("url", result.stderr)

    def test_adds_sources_observed_in_scan(self):
        output, result = self.run_builder(
            {"sources": []},
            [],
            {
                "schema_version": "research-source-scan-1.0",
                "sources": [{"source_id": "official-example", "access_method": "web_extract"}],
                "candidates": [{"source_observations": [{"source_id": "official-example", "source_url": "https://official.example.org/event", "event_url": "https://official.example.org/event"}]}],
            },
        )

        self.assertEqual(result.returncode, 0)
        self.assertEqual(output["unique_sources_total"], 1)
        source = output["sources"][0]
        self.assertEqual(source["id"], "official-example")
        self.assertEqual(source["urls"]["homepage"], "https://official.example.org/event")
        self.assertEqual(source["source_role"], "canonical")
        self.assertEqual(source["quality"]["score"], 5)


if __name__ == "__main__":
    unittest.main()
