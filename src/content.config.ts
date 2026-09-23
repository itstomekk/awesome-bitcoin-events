import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_RICH_EVENT_ID_RE = /^evt-[a-z0-9-]+$/;

function isValidIsoDate(value: string) {
  if (!ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const isoDate = z.preprocess(
  (value) => value instanceof Date && !Number.isNaN(value.valueOf()) ? value.toISOString().slice(0, 10) : value,
  z.string().regex(ISO_DATE_RE, 'Expected an ISO date in YYYY-MM-DD format').refine(isValidIsoDate, 'Expected a real calendar date'),
);
const nullableString = z.string().nullable();
const httpUrl = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'URL must use http or https');
const sourceReference = z.string().refine((value) => {
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return true;
  return httpUrl.safeParse(value).success;
}, 'URL references must use http or https');

const datesSchema = z
  .object({
    start: isoDate,
    end: isoDate,
    timezone: nullableString,
    precision: z.literal('day'),
  })
  .passthrough()
  .refine((dates) => dates.end >= dates.start, {
    path: ['end'],
    message: 'End date must be on or after start date',
  });

const locationSchema = z
  .object({
    venue: nullableString,
    city: nullableString,
    region: nullableString,
    country: nullableString,
    country_code: z.string().regex(/^[A-Z]{2}$/).nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    coordinates_precision: nullableString,
  })
  .passthrough();

const classificationSchema = z
  .object({
    event_type: nullableString,
    topics: z.array(z.string()),
    bitcoin_relevance: z.string(),
    delivery_mode: z.enum(['in_person', 'online', 'hybrid', 'unknown']),
  })
  .passthrough();

const linksSchema = z
  .object({
    official_url: httpUrl.nullable(),
    registration_url: httpUrl.nullable(),
    livestream_url: httpUrl.nullable(),
    social_urls: z.array(httpUrl),
  })
  .passthrough();

const sourceObservationSchema = z
  .object({
    source_id: z.string().min(1),
    reported_source_id: z.string().min(1).optional(),
    source_url: sourceReference,
    event_url: sourceReference.nullable(),
    access_method: z.string(),
    observed_at: z.string(),
    reported_at: z.string().nullable().optional(),
    legacy_record_id: z.union([z.number(), z.string()]).nullable().optional(),
    fields_observed: z.array(z.string()).optional(),
    raw_excerpt: z.string().nullable().optional(),
  })
  .passthrough();

const maintainerSchema = z
  .object({
    id: z.string().regex(SAFE_RICH_EVENT_ID_RE, 'Maintainer IDs must match evt-[a-z0-9-]+'),
    title: z.string().min(1),
    series: nullableString,
    dates: datesSchema,
    location: locationSchema,
    classification: classificationSchema,
    organizer: z
      .object({
        name: nullableString,
        urls: z.array(httpUrl),
      })
      .passthrough(),
    links: linksSchema,
    description: nullableString,
    media: z
      .object({
        image_url: httpUrl.nullable(),
      })
      .passthrough(),
    lifecycle: z
      .object({
        status: z.enum(['announced', 'past', 'cancelled', 'postponed', 'unknown']),
        published: z.boolean().nullable(),
        cancelled: z.boolean(),
      })
      .passthrough(),
    verification: z
      .object({
        state: z.enum(['official_page_seen', 'discovery_only', 'legacy_imported', 'needs_review']),
        confidence: z.enum(['unverified', 'low', 'medium', 'high']),
        last_verified_at: z.string().nullable(),
        notes: nullableString,
      })
      .passthrough(),
    source_observations: z.array(sourceObservationSchema).min(1),
    aliases: z.array(z.string()),
    legacy_payload: z.record(z.string(), z.unknown()).optional(),
    legacy_dataset: z.record(z.string(), z.unknown()).optional(),
    extensions: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

const eventFields = {
  title: z.string().min(1),
  start: isoDate,
  end: isoDate.optional(),
  location: z.string().min(1),
  format: z.string().nullable().optional(),
};

const eventFrontmatter = (schema: z.ZodTypeAny) => schema.refine(
  (event) => !event.end || event.end >= event.start,
  { path: ['end'], message: 'End date must be on or after start date' },
);

const contributorEventSchema = eventFrontmatter(z.object({
  ...eventFields,
  url: httpUrl,
}).passthrough()).refine(
  (event) => !Object.prototype.hasOwnProperty.call(event, 'maintainer'),
  { path: ['maintainer'], message: 'Maintainer records must use the migrated event schema' },
);

const migratedEventSchema = eventFrontmatter(z.object({
  ...eventFields,
  url: httpUrl.nullable(),
  maintainer: maintainerSchema,
}));

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.union([migratedEventSchema, contributorEventSchema]),
});

export const collections = { events };
