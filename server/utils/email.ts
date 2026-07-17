import { Resend } from 'resend'
import { qrBuffer } from './qr'

// Single mail gateway for the whole app. With RESEND_API_KEY set, mail goes
// out via Resend; without it (local dev), the message is printed to the server
// console so flows stay testable end-to-end.

interface Attachment { filename: string; content: Buffer; contentType: string; contentId?: string }
interface MailInput { to: string; subject: string; html: string; attachments?: Attachment[] }

let _resend: Resend | null = null

export async function sendMail({ to, subject, html, attachments }: MailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM || 'BICTA <onboarding@resend.dev>'

  if (!apiKey) {
    console.info(`\n[mail:console] to=${to}\n[mail:console] subject=${subject}\n[mail:console] ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)}${attachments?.length ? `\n[mail:console] (+${attachments.length} inline attachment: QR)` : ''}\n`)
    return
  }

  if (!_resend) _resend = new Resend(apiKey)
  const { error } = await _resend.emails.send({ from, to, subject, html, attachments })
  if (error) console.error(`[mail] send failed to=${to} subject="${subject}": ${error.message}`)
}

export function siteUrl(path = ''): string {
  const base = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}

// The QR is embedded as an inline CID attachment (renders in Gmail/Outlook/
// Apple Mail without any public URL). HTML references it as <img src="cid:qr">.
async function qrAttachment(checkinToken: string): Promise<Attachment> {
  return { filename: 'bicta-qr.png', content: await qrBuffer(checkinToken), contentType: 'image/png', contentId: 'qr' }
}

// ---- Email design system (table-based, inline styles — the only reliable way
// across clients). Mirrors the site: brand blue #2563eb, ink header, soft
// slate text, rounded card. ----

const C = {
  brand: '#2563eb', brandSoft: '#eff5ff', ink: '#0f172a', soft: '#475569',
  faint: '#94a3b8', line: '#e2e8f0', bg: '#eef2f7', mist: '#f8fafc',
}
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"

function shell(opts: { preheader?: string; body: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${opts.preheader ?? ''}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 28px rgba(15,23,42,0.08);">
        <tr><td style="height:5px;background:${C.brand};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:${C.ink};padding:24px 34px;">
          <table role="presentation" width="100%"><tr>
            <td style="font-family:${FONT};font-size:23px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">BICTA<span style="color:${C.brand};">.</span></td>
            <td align="right" style="font-family:${FONT};font-size:10px;font-weight:700;color:${C.faint};letter-spacing:1.5px;text-transform:uppercase;">National ICT Festival</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:34px 34px 30px;font-family:${FONT};">${opts.body}</td></tr>
        <tr><td style="padding:22px 34px;background:${C.mist};border-top:1px solid ${C.line};">
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};">You received this because your email was used for a BICTA competition registration. If this wasn't you, you can safely ignore it.</p>
        </td></tr>
      </table>
      <p style="font-family:${FONT};font-size:11px;color:${C.faint};margin:16px 0 0;">© ${new Date().getFullYear()} BICTA &middot; Innovate. Code. Compete.</p>
    </td></tr>
  </table>
</body></html>`
}

const heading = (t: string) => `<h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.ink};letter-spacing:-0.4px;">${t}</h1>`
const para = (t: string) => `<p style="margin:0 0 15px;font-size:15px;line-height:1.65;color:${C.soft};">${t}</p>`
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:12px;background:${C.brand};box-shadow:0 4px 12px rgba(37,99,235,0.35);">
    <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${label} &rarr;</a>
  </td></tr></table>`
const qrBlock = () =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;background:${C.brandSoft};border-radius:16px;">
    <tr><td align="center" style="padding:26px;">
      <p style="margin:0 0 14px;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${C.brand};">Your entry QR code</p>
      <img src="cid:qr" alt="Your personal BICTA QR code" width="190" height="190" style="display:block;background:#ffffff;border:10px solid #ffffff;border-radius:16px;box-shadow:0 3px 10px rgba(15,23,42,0.10);" />
      <p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.55;color:${C.soft};">Show this at the kit, food &amp; snack booths on event day.<br/>It's always in your dashboard too.</p>
    </td></tr>
  </table>`
const infoRow = (label: string, value: string) =>
  `<tr>
    <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:13px;color:${C.faint};">${label}</td>
    <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;font-weight:700;color:${C.ink};text-align:right;">${value}</td>
  </tr>`

// ---- Templates (async: they build the inline QR attachment) ----

export async function inviteEmail(opts: { name: string; teamName: string; competition: string; inviteToken: string; checkinToken: string }) {
  const link = siteUrl(`/portal/set-password?token=${opts.inviteToken}`)
  return {
    subject: `You're on ${opts.teamName || 'a team'} for ${opts.competition}`,
    html: shell({
      preheader: `Set your password and get your entry QR for ${opts.competition}.`,
      body:
        heading(`Welcome, ${opts.name}!`) +
        para(`You've been added to <strong style="color:${C.ink}">${opts.teamName || 'a team'}</strong> for <strong style="color:${C.ink}">${opts.competition}</strong>.`) +
        para('Set a password to activate your account. Your dashboard shows your team, event details and your personal entry QR.') +
        button(link, 'Set my password') +
        qrBlock(),
    }),
    attachments: [await qrAttachment(opts.checkinToken)],
  }
}

export async function leaderConfirmationEmail(opts: { name: string; teamName: string; competition: string; checkinToken: string }) {
  const link = siteUrl('/portal/login')
  return {
    subject: `Registration received — ${opts.competition}`,
    html: shell({
      preheader: `You're registered for ${opts.competition}. Here's your entry QR.`,
      body:
        heading(`You're in, ${opts.name}!`) +
        para(`Your registration for <strong style="color:${C.ink}">${opts.competition}</strong> was received. We'll confirm your spot soon — track it in your dashboard.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;">${infoRow('Competition', opts.competition)}${opts.teamName ? infoRow('Team', opts.teamName) : ''}</table>` +
        button(link, 'Open my dashboard') +
        qrBlock(),
    }),
    attachments: [await qrAttachment(opts.checkinToken)],
  }
}

export function resetEmail(opts: { name: string; resetToken: string }) {
  const link = siteUrl(`/portal/reset?token=${opts.resetToken}`)
  return {
    subject: 'Reset your BICTA password',
    html: shell({
      preheader: 'Choose a new password. Link expires in 1 hour.',
      body:
        heading('Reset your password') +
        para(`Hi ${opts.name}, click below to choose a new password. This link works once and expires in <strong style="color:${C.ink}">1 hour</strong>.`) +
        button(link, 'Reset password') +
        para(`<span style="font-size:13px;color:${C.faint}">If you didn't request this, ignore this email — your password stays unchanged.</span>`),
    }),
  }
}
