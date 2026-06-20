import { randomUUID } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Magic-byte signatures — extension and client MIME are never trusted.
function detectRaster(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

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

const UPLOAD_DIR = resolve('public/uploads')

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  assertRateLimit(event, { bucket: 'upload', max: 30, windowMs: 60 * 60 * 1000 })

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  if (file.data.length > MAX_SIZE) throw createError({ statusCode: 413, statusMessage: 'File too large (max 5 MB)' })

  let ext: string
  let data: Buffer = file.data

  const raster = detectRaster(file.data)
  if (raster) {
    ext = raster
  } else if (looksLikeSvg(file.data)) {
    ext = 'svg'
    data = Buffer.from(sanitizeSvg(file.data.toString('utf8')), 'utf8')
  } else {
    throw createError({ statusCode: 415, statusMessage: 'Only JPEG, PNG, WebP or SVG images are allowed' })
  }

  // Server-generated name; client filename never touches the filesystem path.
  const filename = `${randomUUID()}.${ext}`
  const target = resolve(join(UPLOAD_DIR, filename))
  if (!target.startsWith(UPLOAD_DIR)) throw createError({ statusCode: 400, statusMessage: 'Invalid path' })

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(target, data)

  return { url: `/uploads/${filename}` }
})
