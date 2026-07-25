import { useUploads, contentTypeFor, isSafeUploadKey, UPLOAD_PREFIX } from '../../utils/storage'

// Serves uploaded images out of the private R2 bucket. Kept as a Worker route
// (rather than a public bucket) so /uploads/** keeps the immutable cache and
// the strict CSP declared in nuxt.config routeRules — the SVG containment.
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') ?? ''
  if (!isSafeUploadKey(key)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const object = await useUploads(event).get(`${UPLOAD_PREFIX}${key}`)
  if (!object) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setResponseHeader(event, 'Content-Type', object.httpMetadata?.contentType ?? contentTypeFor(key))
  setResponseHeader(event, 'ETag', object.httpEtag)
  // routeRules already set Cache-Control + CSP + nosniff for /uploads/**.

  return object.body
})
