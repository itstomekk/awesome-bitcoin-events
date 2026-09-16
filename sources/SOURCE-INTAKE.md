# Source intake

## Input

Tomek can send a URL in chat, with or without context. Preferred compact form:

```text
source: https://example.org/events
```

An event URL, calendar URL, RSS feed, iCal URL, organiser page, Luma calendar, Meetup page, or
community event directory are all valid inputs.

## What happens for every source

1. Fetch the listing and one or more event-detail pages.
2. Record the access path: API, RSS, iCal, server-rendered HTML, JavaScript-only page, or manual.
3. Extract candidate events: title, start/end, timezone when present, venue, city/country, official URL,
   organiser, description, and source URL.
4. Compare candidates against known records and official event pages.
5. Save a source review with the evidence, yield, duplicate rate, freshness, and decision.
6. Add or update the source registry only after the review.

## Monitoring decision

| Cadence | Use when |
|---|---|
| 1 day | Canonical source with structured data, recent updates, or an event within 30 days. |
| 7 days | Healthy source producing verified unique current events. |
| 14 days | Low-volume but useful source, or no unique event across two checks. |
| 30 days | Stale, past-only, blocked, or low-yield source kept for recovery. |
| dormant | Three consecutive no-change checks after downgrades. Preserve history, do not delete. |

An automated monitor is allowed only after the source has a working, repeatable access path.

## What is never automatic

- publishing a candidate event as canonical;
- overwriting dates from an official source with a directory listing;
- treating a past event as upcoming;
- starting a new cron just because a source exists;
- storing access credentials or logged-in browser state in the registry.
