import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'
import { eventSchema } from '../../../utils/validation'
import { slugify, uniqueSlug } from '../../../utils/slug'
import { sanitizeRichText } from '../../../utils/sanitize'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, eventSchema.parse)
  const db = useDb()

  const base = slugify(body.slug || body.title)
  const slug = await uniqueSlug(base, async (s) => !!(await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.slug, s)).get()))

  const [row] = await db
    .insert(schema.events)
    .values({
      title: body.title,
      year: body.year,
      slug,
      description: sanitizeRichText(body.description),
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      venue: body.venue ?? null,
      heroImage: body.heroImage || null,
      status: body.status,
      featured: body.featured,
      theme: body.theme,
      organizer: body.organizer,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      emergencyContact: body.emergencyContact,
      entryFee: body.entryFee,
      certificate: body.certificate,
      language: body.language,
      eligibility: body.eligibility,
      objectives: body.objectives,
      audience: body.audience,
      benefits: body.benefits,
      venueAddress: body.venueAddress,
      venueDirections: body.venueDirections,
      venueParking: body.venueParking,
      mapEmbed: body.mapEmbed,
      tagline: body.tagline,
      eventType: body.eventType,
      published: body.published,
      countdownMode: body.countdownMode,
      countdownAt: body.countdownAt ?? null,
      meetingInfo: body.meetingInfo,
      sections: body.sections,
      seoDescription: body.seoDescription,
    })
    .returning()

  return row
})
