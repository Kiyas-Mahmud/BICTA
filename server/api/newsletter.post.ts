import { useDb, schema } from '../database/client'
import { newsletterSchema } from '../utils/validation'

// SECOND public unauthenticated write endpoint (after /api/registrations).
// Same hardening contract: rate limit -> honeypot/time-trap -> Zod -> dedupe.
// Any further public write endpoint requires explicit security review.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'newsletter', max: 5, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, newsletterSchema.parse)

  // Honeypot: bots that fill the hidden field get a fake success.
  if (body.website !== '') return { ok: true }

  // Time trap: sub-3s submits are bots.
  const renderedAt = Number(body.formToken)
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Submission rejected. Please try again.' })
  }

  // Dedupe quietly: already-subscribed returns the same friendly success.
  await useDb().insert(schema.newsletterSubscribers).values({ email: body.email }).onConflictDoNothing()

  return { ok: true }
})
