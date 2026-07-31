import type { H3Event } from 'h3'

// Uploads live in the R2 bucket bound as `UPLOADS` (see wrangler.jsonc).
// The bucket stays private: everything is served back through
// server/routes/uploads/[key].get.ts so the locked-down CSP headers set in
// nuxt.config's routeRules still apply to user-uploaded SVGs.

export const UPLOAD_PREFIX = 'uploads/'
// Application-answer files live under a separate prefix in the same bucket,
// served by a different, access-controlled route (server/routes/applications/
// [key].get.ts) — never the public /uploads/** one.
export const APPLICATION_PREFIX = 'applications/'

export function useUploads(event: H3Event) {
  const bucket = (event.context as { cloudflare?: { env?: Record<string, any> } })?.cloudflare?.env?.UPLOADS
  if (!bucket) {
    throw createError({
      statusCode: 500,
      statusMessage: 'R2 binding "UPLOADS" unavailable. Run through nuxt dev / wrangler and check wrangler.jsonc.',
    })
  }
  return bucket as R2Bucket
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function contentTypeFor(key: string) {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

/** Object keys are server-generated UUID filenames — reject anything else. */
export function isSafeUploadKey(key: string) {
  return /^[0-9a-f-]{36}\.(jpg|png|webp|svg)$/i.test(key)
}

/** Same idea, scoped to the wider application-file allowlist. */
export function isSafeApplicationKey(key: string) {
  return /^[0-9a-f-]{36}\.(pdf|doc|docx|jpg|png|webp)$/i.test(key)
}
