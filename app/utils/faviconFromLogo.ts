// Builds the browser-tab icon from the uploaded site logo, in the admin's
// browser, so changing the logo changes the tab too.
//
// A favicon is drawn at 16px and has to be square; the logo is a wide
// wordmark, which at that size shrinks to an unreadable smudge. So instead of
// shrinking the whole logo, this cuts out its first letter and knocks it out in
// white on a rounded tile in the logo's own ink colour -- the treatment that
// stays legible at 16px. A logo that is already squarish (an emblem rather than
// a wordmark) is instead fitted whole onto a white tile.
//
// Runs on a canvas, not on the server: the Worker has no image library, and the
// admin is already holding the image when they upload it.

const SIZE = 256
const SCAN_HEIGHT = 400 // analyse a downscaled copy; draw from the original

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the logo image'))
    img.src = url
  })
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function roundedTile(ctx: CanvasRenderingContext2D, fill: string) {
  const r = SIZE * 0.22
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(SIZE, 0, SIZE, SIZE, r)
  ctx.arcTo(SIZE, SIZE, 0, SIZE, r)
  ctx.arcTo(0, SIZE, 0, 0, r)
  ctx.arcTo(0, 0, SIZE, 0, r)
  ctx.closePath()
  ctx.fill()
}

interface Box { x0: number; y0: number; x1: number; y1: number } // inclusive

export async function faviconFromLogo(logoUrl: string): Promise<Blob> {
  const img = await loadImage(logoUrl)
  const scale = Math.min(1, SCAN_HEIGHT / img.naturalHeight)
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const scan = canvas(w, h).getContext('2d', { willReadFrequently: true })!
  scan.drawImage(img, 0, 0, w, h)
  const px = scan.getImageData(0, 0, w, h).data

  // Ink = anything that is not the background. Transparent logos have an
  // alpha background; opaque exports (a JPEG on white) take the corner pixel.
  const bgAlpha = px[3]!
  const bg = [px[0]!, px[1]!, px[2]!]
  const isInk = (x: number, y: number) => {
    const i = (y * w + x) * 4
    if (px[i + 3]! < 40) return false
    if (bgAlpha < 40) return true
    return Math.abs(px[i]! - bg[0]!) + Math.abs(px[i + 1]! - bg[1]!) + Math.abs(px[i + 2]! - bg[2]!) > 60
  }

  const rowHas = (y: number, x0 = 0, x1 = w - 1) => {
    for (let x = x0; x <= x1; x++) if (isInk(x, y)) return true
    return false
  }
  const colHas = (x: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) if (isInk(x, y)) return true
    return false
  }

  // Overall extent of the artwork.
  let all: Box | null = null
  for (let y = 0; y < h; y++) {
    if (!rowHas(y)) continue
    for (let x = 0; x < w; x++) {
      if (!isInk(x, y)) continue
      all = all
        ? { x0: Math.min(all.x0, x), y0: all.y0, x1: Math.max(all.x1, x), y1: y }
        : { x0: x, y0: y, x1: x, y1: y }
    }
  }
  if (!all) throw new Error('The logo looks empty')

  const toSource = (b: Box) => ({
    sx: b.x0 / scale,
    sy: b.y0 / scale,
    sw: (b.x1 - b.x0 + 1) / scale,
    sh: (b.y1 - b.y0 + 1) / scale,
  })

  const glyph = firstGlyph(all)
  const out = canvas(SIZE, SIZE)
  const ctx = out.getContext('2d')!

  if (glyph) {
    // Tile in the logo's own ink colour, averaged over the letter.
    let r = 0, g = 0, b = 0, n = 0
    for (let y = glyph.y0; y <= glyph.y1; y++) {
      for (let x = glyph.x0; x <= glyph.x1; x++) {
        if (!isInk(x, y)) continue
        const i = (y * w + x) * 4
        r += px[i]!; g += px[i + 1]!; b += px[i + 2]!; n++
      }
    }
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
    // White on a pale tile would vanish; fall back to the site's dark ink.
    const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55
    roundedTile(ctx, light ? '#26302a' : `rgb(${r},${g},${b})`)

    // The letter in white. The mask is "how far this pixel is from the
    // background", not the pixel's alpha: an opaque export (a JPEG on white)
    // is fully opaque everywhere, so an alpha mask would whiten the whole crop
    // into a solid rectangle. The ramp keeps the letter's anti-aliased edges.
    const s = toSource(glyph)
    const fit = Math.min((SIZE * 0.5) / s.sh, (SIZE * 0.64) / s.sw)
    const gw = Math.round(s.sw * fit)
    const gh = Math.round(s.sh * fit)
    const mark = canvas(gw, gh).getContext('2d', { willReadFrequently: true })!
    mark.drawImage(img, s.sx, s.sy, s.sw, s.sh, 0, 0, gw, gh)
    const m = mark.getImageData(0, 0, gw, gh)
    const d = m.data
    for (let i = 0; i < d.length; i += 4) {
      let a = d[i + 3]! / 255
      if (bgAlpha >= 40) {
        const diff = Math.abs(d[i]! - bg[0]!) + Math.abs(d[i + 1]! - bg[1]!) + Math.abs(d[i + 2]! - bg[2]!)
        a *= Math.min(1, Math.max(0, (diff - 30) / 90))
      }
      d[i] = 255
      d[i + 1] = 255
      d[i + 2] = 255
      d[i + 3] = Math.round(a * 255)
    }
    mark.putImageData(m, 0, 0)
    ctx.drawImage(mark.canvas, Math.round((SIZE - gw) / 2), Math.round((SIZE - gh) / 2))
  } else {
    // Emblem-shaped logo, or no clean first letter: fit it whole on white.
    roundedTile(ctx, '#ffffff')
    const s = toSource(all)
    const fit = Math.min((SIZE * 0.8) / s.sw, (SIZE * 0.8) / s.sh)
    const dw = s.sw * fit
    const dh = s.sh * fit
    ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh)
  }

  return new Promise((resolve, reject) =>
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the icon'))), 'image/png'),
  )

  // The first letter of the top line, or null when the logo is not a wordmark.
  function firstGlyph(box: Box): Box | null {
    // Roughly square artwork is an emblem, not a line of letters.
    if ((box.x1 - box.x0 + 1) / (box.y1 - box.y0 + 1) < 1.4) return null

    // Top line only: stop at the first blank band (the tagline sits below).
    const minRowGap = Math.max(2, Math.round((box.y1 - box.y0 + 1) * 0.02))
    let lineEnd = box.y0
    let blank = 0
    for (let y = box.y0; y <= box.y1; y++) {
      if (rowHas(y, box.x0, box.x1)) { lineEnd = y; blank = 0 }
      else if (++blank >= minRowGap) break
    }
    const lineH = lineEnd - box.y0 + 1

    // First run of inked columns, ended by a gap between letters.
    const minColGap = Math.max(3, Math.round(lineH * 0.03))
    let x = box.x0
    while (x <= box.x1 && !colHas(x, box.y0, lineEnd)) x++
    const start = x
    let end = x
    blank = 0
    for (; x <= box.x1; x++) {
      if (colHas(x, box.y0, lineEnd)) { end = x; blank = 0 }
      else if (++blank >= minColGap) break
    }

    // Tighten vertically to the letter itself.
    let y0 = lineEnd
    let y1 = box.y0
    for (let y = box.y0; y <= lineEnd; y++) {
      for (let cx = start; cx <= end; cx++) {
        if (isInk(cx, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break }
      }
    }
    const g = { x0: start, y0, x1: end, y1 }

    // Sanity: a letter is neither a sliver nor most of the line. Anything else
    // means the gap detection did not find clean letters -- use the fallback.
    const aspect = (g.x1 - g.x0 + 1) / (g.y1 - g.y0 + 1)
    if (aspect < 0.25 || aspect > 1.8) return null
    if (g.x1 - g.x0 + 1 > (box.x1 - box.x0 + 1) * 0.6) return null
    return g
  }
}
