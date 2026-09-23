import html
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
# AUDIT NOTE: ".cmd" binaries exist only on Windows; on Linux/macOS these build tests fail
# with FileNotFoundError (8 of 45 tests). CI does not run pytest, so this went unnoticed.
ASTRO = ROOT / "node_modules" / ".bin" / "astro.cmd"
NODE = "node"


def run_astro_build(project_dir: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(ASTRO), "build"],
        cwd=project_dir,
        capture_output=True,
        text=True,
    )


def run_node_module(script: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [NODE, "--input-type=module", "-e", script],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


def create_collection_project(markdown: str) -> tuple[Path, TemporaryDirectory[str]]:
    temp_dir = TemporaryDirectory(prefix="astro-content-test-", dir=ROOT)
    project_dir = Path(temp_dir.name)
    (project_dir / "src" / "content" / "events").mkdir(parents=True)
    (project_dir / "src" / "content.config.ts").write_text(
        (ROOT / "src" / "content.config.ts").read_text(encoding="utf-8"), encoding="utf-8"
    )
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


def create_route_project(markdown: str) -> tuple[Path, TemporaryDirectory[str]]:
    project_dir, temp_dir = create_collection_project(markdown)
    (project_dir / "src" / "lib").mkdir(parents=True, exist_ok=True)
    (project_dir / "src" / "layouts").mkdir(parents=True, exist_ok=True)
    (project_dir / "src" / "pages" / "events").mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / "src" / "lib" / "content-events.js", project_dir / "src" / "lib" / "content-events.js")
    shutil.copy(ROOT / "src" / "lib" / "events.js", project_dir / "src" / "lib" / "events.js")
    (project_dir / "src" / "layouts" / "BaseLayout.astro").write_text(
        "<html><body><slot /></body></html>\n", encoding="utf-8"
    )
    shutil.copy(
        ROOT / "src" / "pages" / "events" / "[id].astro",
        project_dir / "src" / "pages" / "events" / "[id].astro",
    )
    return project_dir, temp_dir


def test_calendar_pages_use_markdown_collection_instead_of_event_json():
    index = (ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
    detail = (ROOT / "src" / "pages" / "events" / "[id].astro").read_text(encoding="utf-8")
    events_helper = (ROOT / "src" / "lib" / "events.js").read_text(encoding="utf-8")

    assert "getCollection('events')" in index
    assert "data/events.json" not in index
    assert "data/events.json" not in detail
    assert "data/events.json" not in events_helper
    assert "adaptEventEntries" in index
    assert "render(entry)" in detail


def test_built_detail_page_contains_markdown_body():
    env = os.environ.copy()
    env["PUBLIC_BASE_PATH"] = "/awesome-bitcoin-events"
    result = subprocess.run(
        ["npm.cmd", "run", "build"],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr

    output = (
        ROOT
        / "dist"
        / "events"
        / "evt-bitcoin-asia-2026-2026-08-27-hong-kong"
        / "index.html"
    ).read_text(encoding="utf-8")
    assert "Bitcoin Asia 2026, confirmed as a historical event" in output


def test_contributor_only_markdown_generates_a_safe_detail_route():
    project_dir, temp_dir = create_route_project(
        """---
title: Community Meetup
start: '2026-09-22'
end: '2026-09-23'
location: 'Nashville, USA'
url: https://example.test/community-meetup
---
A community event.
"""
    )
    try:
        result = run_astro_build(project_dir)
        assert result.returncode == 0, result.stderr
        detail = project_dir / "dist" / "events" / "content-event" / "index.html"
        assert detail.exists()
        assert "Community Meetup" in detail.read_text(encoding="utf-8")
    finally:
        temp_dir.cleanup()


def test_next_events_are_sorted_before_the_three_item_selection():
    index = (ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
    assert re.search(
        r"const nextEvents = \[\.\.\.upcomingEvents\]\.sort\(\(a, b\) => a\.dates\.start\.localeCompare\(b\.dates\.start\)\)\.slice\(0, 3\);",
        index,
    )


def test_content_adapter_rejects_unsafe_and_duplicate_runtime_ids():
    result = run_node_module(
        """
import { adaptEventEntry, adaptEventEntries } from './src/lib/content-events.js';
const dates = { start: '2026-09-22', end: '2026-09-23' };
const unsafe = { id: '2026/unsafe', data: { maintainer: { id: 'javascript:route', dates } } };
try { adaptEventEntry(unsafe); } catch (error) { console.log(`unsafe:${error.message}`); }
const contributor = (id) => ({ id, data: { title: 'Meetup', start: '2026-09-22', location: 'Nashville, USA', url: 'https://example.test/meetup' } });
try { adaptEventEntries([contributor('2026/shared'), contributor('2026/shared')]); } catch (error) { console.log(`duplicate:${error.message}`); }
"""
    )
    assert result.returncode == 0, result.stderr
    assert "unsafe:" in result.stdout
    assert "duplicate:" in result.stdout


def test_contributor_location_parser_uses_only_documented_component_order():
    result = run_node_module(
        """
import { parseLocation } from './src/lib/content-events.js';
console.log(JSON.stringify({
  venue: parseLocation('Bitcoin Park, Nashville, USA'),
  city: parseLocation('Nashville, USA'),
  unknown: parseLocation('Venue, City, Region, USA'),
}));
"""
    )
    assert result.returncode == 0, result.stderr
    parsed = json.loads(result.stdout)
    assert parsed["venue"]["venue"] == "Bitcoin Park"
    assert parsed["venue"]["city"] == "Nashville"
    assert parsed["venue"]["country"] == "USA"
    assert parsed["city"]["venue"] is None
    assert parsed["city"]["city"] == "Nashville"
    assert parsed["city"]["country"] == "USA"
    assert parsed["unknown"]["city"] is None


def test_contributor_location_parser_accepts_only_case_insensitive_online_alias():
    result = run_node_module(
        """
import { adaptEventEntry, parseLocation } from './src/lib/content-events.js';
const locations = ['Online', 'online', 'ONLINE', 'virtual', 'remote', 'webinar'];
console.log(JSON.stringify(locations.map((location) => {
  const parsed = parseLocation(location);
  const event = adaptEventEntry({
    id: `event-${location}`,
    data: { title: 'Meetup', start: '2026-09-22', location, url: 'https://example.test/meetup' },
  });
  return { parsed, deliveryMode: event.classification.delivery_mode };
})));
"""
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == [
        {
            "parsed": {
                "venue": None,
                "city": "Online",
                "region": None,
                "country": None,
                "country_code": None,
                "latitude": None,
                "longitude": None,
                "coordinates_precision": None,
            },
            "deliveryMode": "online",
        },
        {
            "parsed": {
                "venue": None,
                "city": "Online",
                "region": None,
                "country": None,
                "country_code": None,
                "latitude": None,
                "longitude": None,
                "coordinates_precision": None,
            },
            "deliveryMode": "online",
        },
        {
            "parsed": {
                "venue": None,
                "city": "Online",
                "region": None,
                "country": None,
                "country_code": None,
                "latitude": None,
                "longitude": None,
                "coordinates_precision": None,
            },
            "deliveryMode": "online",
        },
        {
            "parsed": {
                "venue": None,
                "city": None,
                "region": None,
                "country": None,
                "country_code": None,
                "latitude": None,
                "longitude": None,
                "coordinates_precision": None,
            },
            "deliveryMode": "unknown",
        },
        {
            "parsed": {
                "venue": None,
                "city": None,
                "region": None,
                "country": None,
                "country_code": None,
                "latitude": None,
                "longitude": None,
                "coordinates_precision": None,
            },
            "deliveryMode": "unknown",
        },
        {
            "parsed": {
                "venue": None,
                "city": None,
                "region": None,
                "country": None,
                "country_code": None,
                "latitude": None,
                "longitude": None,
                "coordinates_precision": None,
            },
            "deliveryMode": "unknown",
        },
    ]


def test_contributor_location_parser_rejects_empty_segments_without_compacting():
    result = run_node_module(
        """
import { parseLocation } from './src/lib/content-events.js';
const malformed = [
  'Venue,, USA',
  'Nashville, USA,',
  ', Nashville, USA',
  'Venue, City, Region, USA',
];
console.log(JSON.stringify(malformed.map((value) => parseLocation(value))));
"""
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == [
        {
            "venue": None,
            "city": None,
            "region": None,
            "country": None,
            "country_code": None,
            "latitude": None,
            "longitude": None,
            "coordinates_precision": None,
        }
    ] * 4


def test_contributor_multi_day_event_stays_upcoming_until_end_date_passes():
    result = run_node_module(
        """
import { adaptEventEntry } from './src/lib/content-events.js';
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const start = new Date(today);
start.setUTCDate(start.getUTCDate() - 1);
const isoDate = (date) => date.toISOString().slice(0, 10);
const event = adaptEventEntry({
  id: 'multi-day-event',
  data: {
    title: 'Multi-day Event',
    start: isoDate(start),
    end: isoDate(today),
    location: 'Online',
    url: 'https://example.test/multi-day-event',
  },
});
console.log(JSON.stringify(event.lifecycle));
"""
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == {
        "status": "announced",
        "published": None,
        "cancelled": False,
    }


def test_map_json_serializer_escapes_script_breakout_characters():
    result = run_node_module(
        """
import { serializeJsonForHtmlScript } from './src/lib/content-events.js';
const serialized = serializeJsonForHtmlScript([{ title: '</script><script>', url: 'https://example.test/?a=<b>&c=1', line: '\\u2028', paragraph: '\\u2029' }]);
console.log(serialized);
"""
    )
    assert result.returncode == 0, result.stderr
    serialized = result.stdout.strip()
    assert "</script>" not in serialized
    assert "<" not in serialized
    assert ">" not in serialized
    assert "&" not in serialized
    assert "\\u003C/script\\u003E" in serialized
    assert "\\u0026" in serialized
    assert "\\u2028" in serialized
    assert "\\u2029" in serialized
    index = (ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
    assert "serializeJsonForHtmlScript(mapEvents)" in index


def test_invalid_contributor_dates_are_rejected():
    for dates in (
        "start: 'September 22, 2026'\nend: '2026-09-23'",
        "start: '2026-09-23'\nend: '2026-09-22'",
    ):
        project_dir, temp_dir = create_collection_project(
            f"""---
title: Invalid dates
{dates}
location: Online
url: https://example.test/invalid-dates
---
"""
        )
        try:
            result = run_astro_build(project_dir)
            assert result.returncode != 0
            output = html.unescape(result.stdout + result.stderr).lower()
            assert "start" in output or "end" in output
        finally:
            temp_dir.cleanup()


def maintainer_markdown() -> str:
    return """---
title: Rich Event
start: '2026-10-10'
end: '2026-10-12'
location: 'Berlin, Germany'
url: https://example.test/rich-event
maintainer:
  id: evt-rich-event-2026-10-10-berlin
  title: Rich Event
  series: null
  dates:
    start: '2026-10-10'
    end: '2026-10-12'
    timezone: null
    precision: day
  location:
    venue: null
    city: Berlin
    region: null
    country: Germany
    country_code: DE
    latitude: 52.52
    longitude: 13.405
    coordinates_precision: city_centroid
  classification:
    event_type: conference
    topics: []
    bitcoin_relevance: bitcoin_focused
    delivery_mode: in_person
  organizer:
    name: null
    urls: []
  links:
    official_url: https://example.test/rich-event
    registration_url: null
    livestream_url: null
    social_urls: []
  description: null
  media:
    image_url: null
  lifecycle:
    status: announced
    published: null
    cancelled: false
  verification:
    state: official_page_seen
    confidence: high
    last_verified_at: null
    notes: null
  source_observations:
  - source_id: rich-source
    source_url: https://example.test/source
    event_url: https://example.test/rich-event
    access_method: test
    observed_at: '2026-09-22T00:00:00Z'
  aliases: []
---
"""


def test_invalid_maintainer_dates_and_urls_are_rejected():
    bad_dates = maintainer_markdown().replace("    start: '2026-10-10'", "    start: 'October 10, 2026'")
    project_dir, temp_dir = create_collection_project(bad_dates)
    try:
        result = run_astro_build(project_dir)
        assert result.returncode != 0
    finally:
        temp_dir.cleanup()

    bad_url = maintainer_markdown().replace("    official_url: https://example.test/rich-event", "    official_url: 'javascript:alert(1)'")
    project_dir, temp_dir = create_collection_project(bad_url)
    try:
        result = run_astro_build(project_dir)
        assert result.returncode != 0
        assert "official_url" in html.unescape(result.stdout + result.stderr)
    finally:
        temp_dir.cleanup()

    bad_id = maintainer_markdown().replace("  id: evt-rich-event-2026-10-10-berlin", "  id: javascript:route")
    project_dir, temp_dir = create_collection_project(bad_id)
    try:
        result = run_astro_build(project_dir)
        assert result.returncode != 0
    finally:
        temp_dir.cleanup()


def test_invalid_contributor_url_is_rejected():
    project_dir, temp_dir = create_collection_project(
        """---
title: Unsafe URL
start: '2026-09-22'
location: Online
url: 'javascript:alert(1)'
---
"""
    )
    try:
        result = run_astro_build(project_dir)
        assert result.returncode != 0
        assert "url" in html.unescape(result.stdout + result.stderr).lower()
    finally:
        temp_dir.cleanup()
