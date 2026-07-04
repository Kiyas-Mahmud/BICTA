import QRCode from 'qrcode'

// Personal QR = the account's opaque checkinToken, nothing else (no PII).
// Staff scanners read the token and resolve it server-side.
export function qrDataUrl(checkinToken: string): Promise<string> {
  return QRCode.toDataURL(checkinToken, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  })
}
