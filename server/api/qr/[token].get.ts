import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../database/client'
import { qrBuffer } from '../../utils/qr'

// Public PNG of a participant's personal QR, keyed by their opaque
// checkinToken (unguessable, no PII). Lets email clients render the QR via a
// normal <img src> — data: URIs are stripped by Gmail. Rate-limited so the
// token space can't be brute-forced for images.
const paramSchema = z.string().trim().min(10).max(200)

export default defineEventHandler(async (event) => {
  assertRateLimit(event, { bucket: 'qr-image', max: 60, windowMs: 60 * 1000 })

  const token = paramSchema.parse(getRouterParam(event, 'token'))
  const account = useDb()
    .select({ id: schema.participantAccounts.id })
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.checkinToken, token))
    .get()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  return qrBuffer(token)
})
