from __future__ import annotations

import subprocess
import textwrap
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "build_event_lists.mjs"


def write_event(root: Path, year: str, slug: str, frontmatter: str) -> None:
    path = root / "src" / "content" / "events" / year / f"{slug}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized_frontmatter = textwrap.dedent(frontmatter).strip()
    path.write_text(f"---\n{normalized_frontmatter}\n---\n\nDescription.\n", encoding="utf-8")


def run_generator(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(SCRIPT), "--root", str(root), *args],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=False,
    )


def make_fixture(tmp_path: Path) -> Path:
    root = tmp_path / "project"
    (root / "src" / "content" / "events").mkdir(parents=True)
    (root / "README.md").write_text(
        "# Fixture\n\nBefore\n\n<!-- EVENTS:UPCOMING:START -->\nold\n<!-- EVENTS:UPCOMING:END -->\n\nAfter\n",
        encoding="utf-8",
    )
    write_event(
        root,
        "2026",
        "today",
        """
        title: 'Pipe | Event'
        start: '2026-09-20'
        end: '2026-09-22'
        location: 'Venue | City, Country'
        url: https://example.test/today
        format: conference | summit
        """,
    )
    write_event(
        root,
        "2025",
        "past",
        """
        title: Past Event
        start: '2025-05-01'
        end: '2025-05-02'
        location: Online
        url: null
        format: meetup
        """,
    )
    write_event(
        root,
        "2024",
        "older",
        """
        title: Older Event
        start: '2024-04-01'
        end: '2024-04-01'
        location: City, Country
        url: null
        maintainer:
          classification:
            event_type: retreat
        """,
    )
    return root


def test_output_is_deterministic_and_preserves_manual_readme_text(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    first = run_generator(root, "--today", "2026-09-22")
    assert first.returncode == 0, first.stderr
    readme = (root / "README.md").read_text(encoding="utf-8")
    archive = (root / "EVENTS.md").read_text(encoding="utf-8")

    second = run_generator(root, "--today", "2026-09-22")
    assert second.returncode == 0, second.stderr
    assert (root / "README.md").read_text(encoding="utf-8") == readme
    assert (root / "EVENTS.md").read_text(encoding="utf-8") == archive
    assert "Before" in readme and "After" in readme


def test_end_date_today_is_upcoming_and_past_events_are_grouped(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    result = run_generator(root, "--today", "2026-09-22")
    assert result.returncode == 0, result.stderr
    readme = (root / "README.md").read_text(encoding="utf-8")
    archive = (root / "EVENTS.md").read_text(encoding="utf-8")

    upcoming = readme.split("<!-- EVENTS:UPCOMING:START -->", 1)[1].split(
        "<!-- EVENTS:UPCOMING:END -->", 1
    )[0]
    assert "Pipe \\| Event" in upcoming
    assert "Past Event" not in upcoming
    assert "https://example.test/today" in upcoming
    assert "Past Event" in archive and "Older Event" in archive
    assert "<summary>2025</summary>" in archive
    assert "<summary>2024</summary>" in archive
    assert "event_type" not in archive
    assert "| retreat |" in archive


def test_table_fields_are_escaped_and_missing_url_is_plain_text(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    result = run_generator(root, "--today", "2026-09-22")
    assert result.returncode == 0, result.stderr
    archive = (root / "EVENTS.md").read_text(encoding="utf-8")
    assert "Pipe \\| Event" in archive
    assert "Venue \\| City, Country" in archive
    assert "conference \\| summit" in archive
    assert "| Past Event | Online | meetup | — |" in archive
    assert "[Past Event]" not in archive


def test_marker_validation_and_stale_check(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    generated = run_generator(root, "--today", "2026-09-22")
    assert generated.returncode == 0, generated.stderr
    fresh = run_generator(root, "--today", "2026-09-22", "--check")
    assert fresh.returncode == 0, fresh.stderr

    readme_path = root / "README.md"
    readme = readme_path.read_bytes()
    readme_path.write_bytes(readme.replace(b"Pipe \\| Event", b"Changed \\| Event", 1))
    stale = run_generator(root, "--today", "2026-09-22", "--check")
    assert stale.returncode != 0
    assert "README.md" in stale.stderr

    readme_path.write_text("# Missing markers\n", encoding="utf-8")
    missing = run_generator(root, "--today", "2026-09-22")
    assert missing.returncode != 0
    assert "marker" in missing.stderr.lower()


def test_check_allows_manual_readme_text_outside_generated_block(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    generated = run_generator(root, "--today", "2026-09-22")
    assert generated.returncode == 0, generated.stderr

    readme_path = root / "README.md"
    readme = readme_path.read_bytes()
    readme_path.write_bytes(readme.replace("After".encode(), "After — manual note".encode(), 1))

    fresh = run_generator(root, "--today", "2026-09-22", "--check")
    assert fresh.returncode == 0, fresh.stderr
    assert "After — manual note" in readme_path.read_text(encoding="utf-8")


def test_check_without_today_uses_the_committed_as_of_marker(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    generated = run_generator(root, "--today", "2099-01-01")
    assert generated.returncode == 0, generated.stderr

    # A check on a later calendar day must validate against the committed snapshot,
    # not silently regenerate the lists using the machine clock.
    stable_check = run_generator(root, "--check")
    assert stable_check.returncode == 0, stable_check.stderr
    assert "EVENTS:GENERATED-AS-OF:2099-01-01" in (root / "README.md").read_text(encoding="utf-8")
    assert "EVENTS:GENERATED-AS-OF:2099-01-01" in (root / "EVENTS.md").read_text(encoding="utf-8")


def test_check_without_today_rejects_missing_or_invalid_as_of_markers(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    generated = run_generator(root, "--today", "2026-09-22")
    assert generated.returncode == 0, generated.stderr

    readme_path = root / "README.md"
    readme = readme_path.read_text(encoding="utf-8")
    readme_path.write_text(readme.replace("<!-- EVENTS:GENERATED-AS-OF:2026-09-22 -->\n", ""), encoding="utf-8")
    missing = run_generator(root, "--check")
    assert missing.returncode != 0
    assert "as-of" in missing.stderr.lower()

    readme_path.write_text(readme.replace("2026-09-22", "2026-02-30"), encoding="utf-8")
    invalid = run_generator(root, "--check")
    assert invalid.returncode != 0
    assert "calendar date" in invalid.stderr.lower()


def test_hostile_table_fields_cannot_create_markdown_or_html(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    write_event(
        root,
        "2026",
        "hostile",
        r"""
        title: '<b>[not a link](https://evil.test)</b> *bold* `code` | slash /'
        start: '2026-09-23'
        end: '2026-09-23'
        location: |
          <img src="https://evil.test/x"> [venue] | back\slash
          second line
        url: https://official.test/event
        format: '<em>[not a type link](https://evil.test)</em> | *type*'
        """,
    )
    result = run_generator(root, "--today", "2026-09-22")
    assert result.returncode == 0, result.stderr
    archive = (root / "EVENTS.md").read_text(encoding="utf-8")

    assert "&lt;b&gt;" in archive and "&lt;/b&gt;" in archive
    assert "&lt;img src=" in archive and "&lt;/em&gt;" in archive
    assert r"\[not a link\]" in archive
    assert r"\*bold\*" in archive
    assert r"\`code\`" in archive
    assert r"\|" in archive and r"back\\slash" in archive and "<br>" in archive
    assert "[not a link](https://evil.test)" not in archive
    assert "[Official](https://official.test/event)" in archive


def test_ordinary_table_values_remain_readable_and_urls_are_normalized(tmp_path: Path) -> None:
    root = make_fixture(tmp_path)
    write_event(
        root,
        "2026",
        "readable",
        """
        title: 'Bitcoin: in_person & meetup'
        start: '2026-09-23'
        end: '2026-09-23'
        location: w3.hub / Berlin
        url: HTTPS://Example.TEST/event
        format: in_person
        """,
    )
    result = run_generator(root, "--today", "2026-09-22")
    assert result.returncode == 0, result.stderr
    archive = (root / "EVENTS.md").read_text(encoding="utf-8")

    assert "| 2026-09-23 | Bitcoin: in_person & meetup | w3.hub / Berlin | in_person | [Official](https://example.test/event) |" in archive


def test_invalid_official_urls_fail_without_changing_generated_docs(tmp_path: Path) -> None:
    invalid_urls = (
        '"https://example.test/\\r\\n[x](https://evil.test)"',
        "https://example.test/path with-space",
        r"https://example.test\path",
        "https://official.test/event)(https://evil.test",
        "data:text/plain,not-an-http-url",
    )

    for index, invalid_url in enumerate(invalid_urls):
        root = make_fixture(tmp_path / str(index))
        generated = run_generator(root, "--today", "2026-09-22")
        assert generated.returncode == 0, generated.stderr
        readme_path = root / "README.md"
        archive_path = root / "EVENTS.md"
        original_readme = readme_path.read_text(encoding="utf-8")
        original_archive = archive_path.read_text(encoding="utf-8")

        event_path = root / "src" / "content" / "events" / "2026" / "today.md"
        event = event_path.read_text(encoding="utf-8")
        event_path.write_text(event.replace("url: https://example.test/today", f"url: {invalid_url}"), encoding="utf-8")

        result = run_generator(root, "--today", "2026-09-22")
        assert result.returncode != 0
        assert "official URL" in result.stderr
        assert readme_path.read_text(encoding="utf-8") == original_readme
        assert archive_path.read_text(encoding="utf-8") == original_archive
