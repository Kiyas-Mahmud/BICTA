import { Resend } from 'resend'

// Single mail gateway for the whole app. With RESEND_API_KEY set, mail goes
// out via Resend; without it (local dev), the full message is printed to the
// server console so flows stay testable end-to-end.

interface MailInput {
  to: string
  subject: string
  html: string
}

let _resend: Resend | null = null

export async function sendMail({ to, subject, html }: MailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM || 'BICTA <onboarding@resend.dev>'

  if (!apiKey) {
    // Dev transport: log instead of send. Never log real mail in production.
    console.info(`\n[mail:console] to=${to}\n[mail:console] subject=${subject}\n[mail:console] ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)}\n`)
    return
  }

  if (!_resend) _resend = new Resend(apiKey)
  const { error } = await _resend.emails.send({ from, to, subject, html })
  if (error) {
    // Mail failure must never break registration/reset flows; log and move on.
    console.error(`[mail] send failed to=${to} subject="${subject}": ${error.message}`)
  }
}

export function siteUrl(path = ''): string {
  const base = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}

// ---- Templates (inline styles; email clients ignore stylesheets) ----

const wrap = (body: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <p style="font-size:20px;font-weight:800;margin:0 0 16px;color:#0f172a">BICTA<span style="color:#2563eb">.</span></p>
      ${body}
      <p style="font-size:12px;color:#94a3b8;margin-top:28px">You received this email because your address was used for a BICTA competition registration. If this wasn't you, you can ignore it.</p>
    </div>
  </div>`

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:10px;margin:16px 0">${label}</a>`

export function inviteEmail(opts: { name: string; teamName: string; competition: string; inviteToken: string; qrDataUrl: string }) {
  const link = siteUrl(`/portal/set-password?token=${opts.inviteToken}`)
  return {
    subject: `You're on ${opts.teamName || 'a team'} for ${opts.competition} (BICTA)`,
    html: wrap(`
      <p style="color:#0f172a;font-size:16px">Hi ${opts.name},</p>
      <p style="color:#475569">You've been added to <strong>${opts.teamName || 'a team'}</strong> for <strong>${opts.competition}</strong>.</p>
      <p style="color:#475569">Set a password to open your participant dashboard: see your team, competition details, and your personal entry QR code.</p>
      ${btn(link, 'Set my password')}
      <p style="color:#475569;margin-top:20px"><strong>Your personal QR code</strong> (staff scan it when you collect your kit, food and snacks — it's also always available in your dashboard):</p>
      <img src="${opts.qrDataUrl}" alt="Your personal BICTA QR code" width="180" height="180" style="display:block;margin:8px 0" />
    `),
  }
}

export function leaderConfirmationEmail(opts: { name: string; teamName: string; competition: string; qrDataUrl: string }) {
  const link = siteUrl('/portal/login')
  return {
    subject: `Registration received: ${opts.competition} (BICTA)`,
    html: wrap(`
      <p style="color:#0f172a;font-size:16px">Hi ${opts.name},</p>
      <p style="color:#475569">Your registration${opts.teamName ? ` for team <strong>${opts.teamName}</strong>` : ''} in <strong>${opts.competition}</strong> was received. We'll confirm your spot soon — watch your dashboard.</p>
      ${btn(link, 'Open my dashboard')}
      <p style="color:#475569;margin-top:20px"><strong>Your personal QR code</strong> for kit/food collection on event day:</p>
      <img src="${opts.qrDataUrl}" alt="Your personal BICTA QR code" width="180" height="180" style="display:block;margin:8px 0" />
    `),
  }
}

export function resetEmail(opts: { name: string; resetToken: string }) {
  const link = siteUrl(`/portal/reset?token=${opts.resetToken}`)
  return {
    subject: 'Reset your BICTA password',
    html: wrap(`
      <p style="color:#0f172a;font-size:16px">Hi ${opts.name},</p>
      <p style="color:#475569">Click below to choose a new password. The link works once and expires in 1 hour.</p>
      ${btn(link, 'Reset password')}
    `),
  }
}
