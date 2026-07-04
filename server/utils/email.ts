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
    console.info(`\n[mail:console] to=${to}\n[mail:console] subject=${subject}\n[mail:console] ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)}\n`)
    return
  }

  if (!_resend) _resend = new Resend(apiKey)
  const { error } = await _resend.emails.send({ from, to, subject, html })
  if (error) {
    console.error(`[mail] send failed to=${to} subject="${subject}": ${error.message}`)
  }
}

export function siteUrl(path = ''): string {
  const base = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}

// Personal QR served as a real image URL (email clients strip data: URIs).
export function qrImageUrl(checkinToken: string): string {
  return siteUrl(`/api/qr/${checkinToken}`)
}

// ---- Email design system (table-based, inline styles — the only thing that
// renders consistently across Gmail / Outlook / Apple Mail). Mirrors the site:
// brand blue #2563eb, ink #0f172a, soft slate text, rounded card. ----

const C = {
  brand: '#2563eb',
  brandDark: '#1d4ed8',
  ink: '#0f172a',
  soft: '#475569',
  faint: '#94a3b8',
  line: '#e2e8f0',
  bg: '#f1f5f9',
  mist: '#f8fafc',
}

function shell(opts: { preheader?: string; body: string }) {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader ?? ''}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
        <!-- header -->
        <tr><td style="background:${C.ink};padding:22px 32px;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">BICTA<span style="color:${C.brand};">.</span></span>
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${C.faint};letter-spacing:1.5px;text-transform:uppercase;float:right;padding-top:8px;">National ICT Festival</span>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">${opts.body}</td></tr>
        <!-- footer -->
        <tr><td style="padding:20px 32px;background:${C.mist};border-top:1px solid ${C.line};">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.faint};">
            You received this because your email was used for a BICTA competition registration. If this wasn't you, ignore this message.
          </p>
        </td></tr>
      </table>
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.faint};margin:16px 0 0;">© ${new Date().getFullYear()} BICTA — Innovate. Code. Compete.</p>
    </td></tr>
  </table>
</body></html>`
}

function heading(text: string) {
  return `<h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.4px;">${text}</h1>`
}
function para(text: string) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${C.soft};">${text}</p>`
}
function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;"><tr><td style="border-radius:10px;background:${C.brand};">
    <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label} &rarr;</a>
  </td></tr></table>`
}
function qrBlock(qrUrl: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;background:${C.mist};border:1px solid ${C.line};border-radius:14px;">
    <tr><td align="center" style="padding:22px;">
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.brand};">Your entry QR code</p>
      <img src="${qrUrl}" alt="Your personal BICTA QR code" width="180" height="180" style="display:block;border:8px solid #ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,0.08);" />
      <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${C.soft};">Show this at the kit, food &amp; snack booths on event day.<br/>It's always in your dashboard too.</p>
    </td></tr>
  </table>`
}
function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${C.faint};">${label}</td>
    <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${C.ink};text-align:right;">${value}</td>
  </tr>`
}

// ---- Templates ----

export function inviteEmail(opts: { name: string; teamName: string; competition: string; inviteToken: string; qrUrl: string }) {
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
        qrBlock(opts.qrUrl),
    }),
  }
}

export function leaderConfirmationEmail(opts: { name: string; teamName: string; competition: string; qrUrl: string }) {
  const link = siteUrl('/portal/login')
  return {
    subject: `Registration received — ${opts.competition}`,
    html: shell({
      preheader: `You're registered for ${opts.competition}. Here's your entry QR.`,
      body:
        heading(`You're in, ${opts.name}!`) +
        para(`Your registration for <strong style="color:${C.ink}">${opts.competition}</strong> was received. We'll confirm your spot soon — track it in your dashboard.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;">${
          infoRow('Competition', opts.competition)
        }${opts.teamName ? infoRow('Team', opts.teamName) : ''}</table>` +
        button(link, 'Open my dashboard') +
        qrBlock(opts.qrUrl),
    }),
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
        para(`<span style="font-size:13px;color:${C.faint}">If you didn't request this, you can safely ignore this email — your password stays unchanged.</span>`),
    }),
  }
}
