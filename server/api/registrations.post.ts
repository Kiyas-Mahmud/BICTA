import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../database/client'
import { registrationSchema } from '../utils/validation'

// The only unauthenticated write endpoint. Handler order is the security
// contract (Security_Plan.md §6a): rate limit → honeypot/time-trap → schema
// validation → business checks → insert. Keep it that way.
export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'registration', max: 5, windowMs: 60 * 60 * 1000 })

  const body = await readValidatedBody(event, registrationSchema.parse)

  // Honeypot: hidden "website" field must stay empty. Bots that fill it get a
  // fake success so they don't learn anything.
  if (body.website !== '') {
    return { ok: true }
  }

  // Time trap: the form token is its render timestamp; sub-3s submits are bots.
  const renderedAt = Number(body.formToken)
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 3000) {
    throw createError({ statusCode: 400, statusMessage: 'Submission rejected. Please try again.' })
  }

  const db = useDb()
  const comp = db.select().from(schema.competitions).where(eq(schema.competitions.id, body.competitionId)).get()
  if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found' })

  if (!comp.registrationOpen) {
    throw createError({ statusCode: 403, statusMessage: 'Registration is closed for this competition.' })
  }
  if (comp.registrationDeadline && new Date(`${comp.registrationDeadline}T23:59:59Z`) < new Date()) {
    throw createError({ statusCode: 403, statusMessage: 'The registration deadline has passed.' })
  }

  const teamMembers = comp.teamBased ? (body.teamMembers ?? []) : []
  if (teamMembers.length > comp.maxTeamSize - 1) {
    throw createError({ statusCode: 400, statusMessage: `Teams may have at most ${comp.maxTeamSize} members including you.` })
  }

  const duplicate = db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(and(eq(schema.registrations.competitionId, comp.id), eq(schema.registrations.email, body.email)))
    .get()
  if (duplicate) {
    throw createError({ statusCode: 409, statusMessage: 'This email is already registered for this competition.' })
  }

  await db.insert(schema.registrations).values({
    competitionId: comp.id,
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    institution: body.institution,
    teamName: comp.teamBased ? (body.teamName ?? null) : null,
    teamMembers: teamMembers.length ? teamMembers : null,
    notes: body.notes ?? null,
  })

  // Confirmation only — no stored data echoed back.
  return { ok: true }
})
