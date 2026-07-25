import { encode } from 'uqr'

// Personal QR = the account's opaque checkinToken, nothing else (no PII).
// Staff scanners read the token and resolve it server-side.
//
// The matrix comes from `uqr` (pure JS) and is encoded to PNG here by hand.
// The obvious library (`qrcode`) depends on pngjs, which calls util.inherits on
// Node stream prototypes and crashes the Workers runtime at module load.

const TARGET_PX = 360
const MARGIN_MODULES = 2

// ---- minimal PNG writer: 1-bit greyscale, stored (uncompressed) deflate ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function adler32(bytes: Uint8Array) {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

function chunk(type: string, body: Uint8Array) {
  const out = new Uint8Array(body.length + 12)
  const view = new DataView(out.buffer)
  view.setUint32(0, body.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(body, 8)
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)))
  return out
}

/** zlib stream built from stored deflate blocks — no compression, no deps. */
function zlibStored(raw: Uint8Array) {
  const blocks: Uint8Array[] = []
  const MAX = 65535
  for (let offset = 0; offset < raw.length; offset += MAX) {
    const slice = raw.subarray(offset, Math.min(offset + MAX, raw.length))
    const isLast = offset + MAX >= raw.length
    blocks.push(
      new Uint8Array([
        isLast ? 1 : 0,
        slice.length & 0xff,
        (slice.length >> 8) & 0xff,
        ~slice.length & 0xff,
        (~slice.length >> 8) & 0xff,
      ]),
      slice,
    )
  }
  const body = concat(blocks)
  const out = new Uint8Array(body.length + 6)
  out[0] = 0x78 // CMF: deflate, 32K window
  out[1] = 0x01 // FLG: no dictionary
  out.set(body, 2)
  new DataView(out.buffer).setUint32(out.length - 4, adler32(raw))
  return out
}

/** Renders the QR matrix as a 1-bit greyscale PNG (bit 0 = dark, 1 = light). */
function qrPng(text: string): Uint8Array {
  const { data, size } = encode(text, { ecc: 'M', border: MARGIN_MODULES })
  const scale = Math.max(1, Math.floor(TARGET_PX / size))
  const px = size * scale
  const bytesPerRow = Math.ceil(px / 8)

  const raw = new Uint8Array((bytesPerRow + 1) * px)
  for (let y = 0; y < px; y++) {
    const rowStart = y * (bytesPerRow + 1)
    raw[rowStart] = 0 // filter: none
    const row = data[Math.floor(y / scale)]!
    for (let x = 0; x < px; x++) {
      // uqr marks dark modules true; PNG bit 1 = white, so invert.
      if (!row[Math.floor(x / scale)]) raw[rowStart + 1 + (x >> 3)]! |= 0x80 >> (x & 7)
    }
  }

  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, px)
  view.setUint32(4, px)
  ihdr[8] = 1 // bit depth
  ihdr[9] = 0 // colour type: greyscale
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ])
}

// data: URI — fine in the browser (dashboard). NOT for email (Gmail strips it).
export async function qrDataUrl(checkinToken: string): Promise<string> {
  return `data:image/png;base64,${Buffer.from(qrPng(checkinToken)).toString('base64')}`
}

// PNG buffer — served by /api/qr/[token] and attached inline to emails.
export async function qrBuffer(checkinToken: string): Promise<Buffer> {
  return Buffer.from(qrPng(checkinToken))
}
