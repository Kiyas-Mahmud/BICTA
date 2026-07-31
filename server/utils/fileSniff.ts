// Magic-byte signatures — extension and client-declared MIME are never
// trusted. Shared between the admin image uploader and the public
// application-file upload (registrations.post.ts), which needs a wider,
// document-inclusive allowlist.

export function detectRasterImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

// Not a full OOXML parser — a ZIP local-file-header filename scan is
// dependency-free and meaningfully harder to spoof than trusting the
// extension, but a deliberately best-effort check, same spirit as the SVG
// sanitizer elsewhere in this codebase (defense-in-depth, not a formal
// validator).
export function detectDocument(buf: Buffer): 'pdf' | 'doc' | 'docx' | null {
  if (buf.length > 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'doc'
  if (buf.length > 4 && buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const head = buf.subarray(0, 4096).toString('latin1')
    if (head.includes('word/document.xml')) return 'docx'
  }
  return null
}

export const APPLICATION_MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function sniffApplicationFile(buf: Buffer): { ext: 'pdf' | 'doc' | 'docx' | 'jpg' | 'png' | 'webp'; mime: string } | null {
  const raster = detectRasterImage(buf)
  if (raster) return { ext: raster, mime: MIME[raster]! }
  const doc = detectDocument(buf)
  if (doc) return { ext: doc, mime: MIME[doc]! }
  return null
}
