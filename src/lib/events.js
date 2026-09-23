// Small display helpers shared by the home page, the event cards and the detail pages.
// Dates are handled at 12:00 UTC so a date never shifts by one day in any timezone.

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function parseDate(value) {
  return new Date(`${value}T12:00:00Z`);
}

export function formatDate(value, options = {}) {
  if (!value) return 'Date to be confirmed';
  return parseDate(value).toLocaleDateString('en-US', {
    month: options.month || 'short',
    day: 'numeric',
    year: options.year || 'numeric',
    timeZone: 'UTC'
  });
}

export function formatDateRange(event) {
  const { start, end } = event.dates;
  if (!start) return 'Date to be confirmed';
  if (!end || start === end) return formatDate(start);
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${startDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} ${startDate.getUTCDate()}–${endDate.getUTCDate()}, ${startDate.getUTCFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function yearOf(event) {
  return parseDate(event.dates.start).getUTCFullYear();
}

export function monthOf(event) {
  return parseDate(event.dates.start).getUTCMonth() + 1;
}

export function locationLabel(event) {
  const location = event.location;
  if (event.classification.delivery_mode === 'online' || location.city === 'Online') return 'Online';
  return [location.city, location.country].filter(Boolean).join(', ') || 'Location to be confirmed';
}

export function statusLabel(event) {
  if (event.lifecycle.cancelled || event.lifecycle.status === 'cancelled') return 'Cancelled';
  if (event.lifecycle.status === 'postponed') return 'Postponed';
  if (event.lifecycle.status === 'past') return 'Past';
  return 'Upcoming';
}

// Verification states come from the research pipeline:
//   official_page_seen  a maintainer saw the organiser's own page
//   discovery_only      found on an aggregator only; dates not confirmed
//   legacy_imported     carried over from the first version of the list, not re-checked
//   needs_review        conflicting or incomplete evidence
export function verificationLabel(event) {
  const labels = {
    official_page_seen: 'Official page seen',
    discovery_only: 'Discovery lead',
    legacy_imported: 'Legacy record',
    needs_review: 'Needs review'
  };
  return labels[event.verification.state] || 'Unverified';
}

export function verificationTone(event) {
  if (event.verification.state === 'official_page_seen') return 'verified';
  if (event.verification.state === 'needs_review') return 'review';
  if (event.verification.state === 'discovery_only') return 'discovery';
  return 'legacy';
}

// "Upcoming" = anything not marked past or cancelled. It trusts lifecycle.status rather
// than checking dates (see the audit note in content-events.js).
export function upcoming(eventsToFilter = []) {
  return eventsToFilter.filter((event) => event.lifecycle.status !== 'past' && !event.lifecycle.cancelled);
}

export function groupByMonth(eventsToGroup) {
  const groups = new Map();
  [...eventsToGroup]
    .sort((a, b) => a.dates.start.localeCompare(b.dates.start))
    .forEach((event) => {
      const key = `${yearOf(event)}-${String(monthOf(event)).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
  return [...groups.entries()];
}
