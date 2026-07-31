import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { useUploads, isSafeApplicationKey, APPLICATION_PREFIX } from '../../utils/storage'

// Serves application-answer files (resumes, ID docs, pitch decks) out of the
// private R2 bucket. Unlike /uploads/**, these are NOT public — access is
// admin, or any member of the team that owns the file. No matching
// nuxt.config routeRules entry must ever be added for this path: the
// Cache-Control set below is what keeps Cloudflare's edge from caching (and
// thus bypassing) the ownership check.
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') ?? ''
  if (!isSafeApplicationKey(key)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const db = useDb()
  const response = await db
    .select({ registrationId: schema.applicationResponses.registrationId })
    .from(schema.applicationResponses)
    .where(eq(schema.applicationResponses.fileUrl, `/applications/${key}`))
    .get()
  if (!response) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const session = await getUserSession(event)
  const isAdmin = Boolean((session as any)?.user?.id)
  if (!isAdmin) {
    const participant = (session as any)?.participant as { id: number } | undefined
    if (!participant?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    const membership = await db
      .select({ id: schema.teamMembers.id })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.registrationId, response.registrationId), eq(schema.teamMembers.accountId, participant.id)))
      .get()
    if (!membership) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const object = await useUploads(event).get(`${APPLICATION_PREFIX}${key}`)
  if (!object) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setResponseHeader(event, 'Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  setResponseHeader(event, 'Content-Security-Policy', "default-src 'none'")
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  return object.body
})
