import { randomUUID } from 'node:crypto'
import { useUploads, contentTypeFor, UPLOAD_PREFIX } from '../../utils/storage'
import { detectRasterImage } from '../../utils/fileSniff'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

function looksLikeSvg(buf: Buffer): boolean {
  const head = buf.subarray(0, 1000).toString('utf8').trimStart().toLowerCase()
  return (head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!doctype svg')) && head.includes('<svg')
}

// Strip active content from an SVG so a logo can be stored safely (admin-only,
// still defense-in-depth: uploads are also served with a locked-down CSP).
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!ENTITY[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|xlink:href)\s*=\s*"(?!#)[^"]*"/gi, '')
    .replace(/(href|xlink:href)\s*=\s*'(?!#)[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  assertRateLimit(event, { bucket: 'upload', max: 30, windowMs: 60 * 60 * 1000 })

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  if (file.data.length > MAX_SIZE) throw createError({ statusCode: 413, statusMessage: 'File too large (max 5 MB)' })

  let ext: string
  let data: Buffer = file.data

  const raster = detectRasterImage(file.data)
  if (raster) {
    ext = raster
  } else if (looksLikeSvg(file.data)) {
    ext = 'svg'
    data = Buffer.from(sanitizeSvg(file.data.toString('utf8')), 'utf8')
  } else {
    throw createError({ statusCode: 415, statusMessage: 'Only JPEG, PNG, WebP or SVG images are allowed' })
  }

  // Server-generated name; the client filename is never used as a key.
  const filename = `${randomUUID()}.${ext}`

  await useUploads(event).put(`${UPLOAD_PREFIX}${filename}`, data, {
    httpMetadata: {
      contentType: contentTypeFor(filename),
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })

  return { url: `/uploads/${filename}` }
})
