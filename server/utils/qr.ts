import QRCode from 'qrcode'

// Personal QR = the account's opaque checkinToken, nothing else (no PII).
// Staff scanners read the token and resolve it server-side.

const opts = {
  width: 360,
  margin: 2,
  errorCorrectionLevel: 'M' as const,
  color: { dark: '#0f172a', light: '#ffffff' },
}

// data: URI — fine in the browser (dashboard). NOT for email (Gmail strips it).
export function qrDataUrl(checkinToken: string): Promise<string> {
  return QRCode.toDataURL(checkinToken, opts)
}

// PNG buffer — served by /api/qr/[token] so emails can <img src> it.
export function qrBuffer(checkinToken: string): Promise<Buffer> {
  return QRCode.toBuffer(checkinToken, { ...opts, type: 'png' })
}
