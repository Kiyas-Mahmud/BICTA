import { useDb, schema } from '../database/client'
import { contactSchema } from '../utils/validation'

// THIRD public unauthenticated write endpoint (after /api/registrations and
// /api/newsletter). Same hardening contract: rate limit -> honeypot/time-trap
// -> Zod -> insert. Any further public write endpoint requires security review.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'contact', max: 5, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, contactSchema.parse)

  // Honeypot: bots that fill the hidden field get a fake success.
  if (body.website !== '') return { ok: true }

  // Time trap: sub-3s submits are bots.
  const renderedAt = Number(body.formToken)
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Submission rejected. Please try again.' })
  }

  await useDb().insert(schema.contactMessages).values({
    name: body.name,
    email: body.email,
    subject: body.subject,
    message: body.message,
  })

  return { ok: true }
})
