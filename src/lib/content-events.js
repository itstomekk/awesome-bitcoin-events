const ONLINE_LOCATION_RE = /^online$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_RICH_EVENT_ID_RE = /^evt-[a-z0-9-]+$/;
const SAFE_CONTENT_SEGMENT_RE = /^[a-z0-9-]+$/;

function emptyLocation() {
  return {
    venue: null,
    city: null,
    region: null,
    country: null,
    country_code: null,
    latitude: null,
    longitude: null,
    coordinates_precision: null,
  };
}

function isValidIsoDate(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function dateString(value, label = 'Date') {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && isValidIsoDate(value)) return value;
  throw new Error(`${label} must be a valid ISO date in YYYY-MM-DD format`);
}

export function assertDateRange(start, end, label = 'Event') {
  const normalizedStart = dateString(start, `${label} start date`);
  const normalizedEnd = dateString(end, `${label} end date`);
  if (normalizedEnd < normalizedStart) {
    throw new Error(`${label} end date must be on or after its start date`);
  }
  return { start: normalizedStart, end: normalizedEnd };
}

function isOnlineLocation(value) {
  return ONLINE_LOCATION_RE.test(String(value || '').trim());
}

export function parseLocation(value) {
  const raw = String(value || '').trim();
  if (!raw) return emptyLocation();
  if (isOnlineLocation(raw)) return { ...emptyLocation(), city: 'Online' };

  const parts = raw.split(',').map((part) => part.trim());
  if (parts.some((part) => !part)) return emptyLocation();
  if (parts.length === 2) {
    return { ...emptyLocation(), city: parts[0], country: parts[1] };
  }
  if (parts.length === 3) {
    return { ...emptyLocation(), venue: parts[0], city: parts[1], country: parts[2] };
  }
  return emptyLocation();
}

function ensureHttpUrl(value, label) {
  if (value === null || value === undefined) return value;
  let protocol;
  try {
    protocol = new URL(value).protocol;
  } catch {
    throw new Error(`${label} must be a valid http or https URL`);
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`${label} must use http or https`);
  }
  return value;
}

function ensureSafeReference(value, label) {
  if (value === null || value === undefined || !/^[a-z][a-z\d+.-]*:/i.test(value)) return value;
  return ensureHttpUrl(value, label);
}

function validateMaintainerUrls(maintainer) {
  const links = maintainer.links || {};
  ensureHttpUrl(links.official_url, 'Maintainer official URL');
  ensureHttpUrl(links.registration_url, 'Maintainer registration URL');
  ensureHttpUrl(links.livestream_url, 'Maintainer livestream URL');
  (links.social_urls || []).forEach((url) => ensureHttpUrl(url, 'Maintainer social URL'));
  (maintainer.organizer?.urls || []).forEach((url) => ensureHttpUrl(url, 'Maintainer organizer URL'));
  ensureHttpUrl(maintainer.media?.image_url, 'Maintainer image URL');
  (maintainer.source_observations || []).forEach((observation) => {
    ensureSafeReference(observation.source_url, 'Maintainer source URL');
    ensureSafeReference(observation.event_url, 'Maintainer event URL');
  });
}

function safeContentSegments(entry) {
  const raw = typeof entry?.id === 'string' ? entry.id : entry?.slug;
  if (typeof raw !== 'string' || !raw) {
    throw new Error('Contributor content entry is missing a route-safe content ID');
  }
  const segments = raw.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Contributor content ID is not route-safe: ${raw}`);
  }
  const safeSegments = segments.map((segment) => segment.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''));
  if (safeSegments.some((segment) => !SAFE_CONTENT_SEGMENT_RE.test(segment))) {
    throw new Error(`Contributor content ID is not route-safe: ${raw}`);
  }
  return safeSegments;
}

function contentSlug(entry) {
  return entry.slug || entry.id || String(entry.data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function derivedId(entry) {
  return `content-${safeContentSegments(entry).join('-')}`;
}

function derivedLifecycle(start, end) {
  if (!start || !end) return { status: 'unknown', published: null, cancelled: false };
  const today = new Date().toISOString().slice(0, 10);
  return {
    status: end < today ? 'past' : 'announced',
    published: null,
    cancelled: false,
  };
}

function contributorEvent(entry) {
  const { data } = entry;
  const start = dateString(data.start, 'Contributor start date');
  const end = data.end === undefined || data.end === null
    ? start
    : dateString(data.end, 'Contributor end date');
  assertDateRange(start, end, 'Contributor event');
  const location = parseLocation(data.location);
  const officialUrl = ensureHttpUrl(data.url, 'Contributor URL');
  return {
    id: derivedId(entry),
    title: data.title,
    series: null,
    dates: {
      start,
      end,
      timezone: null,
      precision: 'day',
    },
    location,
    classification: {
      event_type: data.format || null,
      topics: [],
      bitcoin_relevance: 'unknown',
      delivery_mode: location.city === 'Online' ? 'online' : 'unknown',
    },
    organizer: { name: null, urls: [] },
    links: {
      official_url: officialUrl,
      registration_url: null,
      livestream_url: null,
      social_urls: [],
    },
    description: null,
    media: { image_url: null },
    lifecycle: derivedLifecycle(start, end),
    verification: {
      state: 'needs_review',
      confidence: 'unverified',
      last_verified_at: null,
      notes: 'Contributor content has not been maintainer-verified.',
    },
    source_observations: [
      {
        source_id: `content-${safeContentSegments(entry).join('-')}`,
        source_url: officialUrl || '',
        event_url: officialUrl,
        access_method: 'content_collection',
        observed_at: 'unknown',
        fields_observed: ['title', 'dates', 'location', 'url'],
      },
    ],
    aliases: [],
    content_id: entry.id,
    content_slug: entry.slug,
  };
}

export function adaptEventEntry(entry) {
  const event = entry.data.maintainer ? { ...entry.data.maintainer } : contributorEvent(entry);
  if (entry.data.maintainer) {
    if (!SAFE_RICH_EVENT_ID_RE.test(event.id)) {
      throw new Error(`Maintainer route ID is not safe: ${event.id}`);
    }
    assertDateRange(event.dates.start, event.dates.end, `Maintainer event ${event.id}`);
    validateMaintainerUrls(event);
  }
  return {
    ...event,
    content_id: entry.id,
    content_slug: entry.slug,
  };
}

export function assertUniqueRuntimeIds(events) {
  const seen = new Map();
  for (const event of events) {
    if (seen.has(event.id)) {
      throw new Error(`Duplicate runtime event ID: ${event.id}`);
    }
    seen.set(event.id, true);
  }
  return events;
}

export function adaptEventEntries(entries) {
  const events = entries.map(adaptEventEntry);
  return assertUniqueRuntimeIds(events);
}

export function serializeJsonForHtmlScript(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('Cannot serialize undefined JSON for an HTML script');
  return serialized
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
