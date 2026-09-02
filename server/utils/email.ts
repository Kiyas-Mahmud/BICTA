import { qrBuffer } from './qr'

// Single mail gateway for the whole app. With RESEND_API_KEY set, mail goes
// out via Resend's REST API; without it (local dev), the message is printed to
// the server console so flows stay testable end-to-end.
//
// The REST endpoint is called with plain fetch rather than the `resend` SDK:
// the SDK pulls in @react-email/render, which cannot be bundled for Workers.

interface Attachment { filename: string; content: Buffer; contentType: string; contentId?: string }
interface MailInput { to: string; subject: string; html: string; attachments?: Attachment[] }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Returns whether the send actually succeeded. Every existing call site
// ignores the return value (they only ever had one recipient and logging was
// enough), so this is additive -- but the broadcast mailer sends to many
// recipients in one request and needs real per-recipient signal to report
// back an honest sent/failed count rather than assuming everything worked.
export async function sendMail({ to, subject, html, attachments }: MailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM || 'BICTA <onboarding@resend.dev>'

  if (!apiKey) {
    console.info(`\n[mail:console] to=${to}\n[mail:console] subject=${subject}\n[mail:console] ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)}${attachments?.length ? `\n[mail:console] (+${attachments.length} inline attachment: QR)` : ''}\n`)
    return true
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
          content_type: a.contentType,
          content_id: a.contentId,
        })),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[mail] send failed to=${to} subject="${subject}": ${res.status} ${detail.slice(0, 200)}`)
      return false
    }
    return true
  } catch (err: any) {
    console.error(`[mail] send failed to=${to} subject="${subject}": ${err?.message ?? err}`)
    return false
  }
}

export function siteUrl(path = ''): string {
  const base = (process.env.PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}

// Admin-authored text (an org name, a subject line) going into a raw HTML
// attribute or text node. Not a rich-text sanitizer -- just enough to stop a
// stray `&`/`<`/`"` from breaking the surrounding markup.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// The QR is embedded as an inline CID attachment (renders in Gmail/Outlook/
// Apple Mail without any public URL). HTML references it as <img src="cid:qr">.
async function qrAttachment(checkinToken: string): Promise<Attachment> {
  return { filename: 'bicta-qr.png', content: await qrBuffer(checkinToken), contentType: 'image/png', contentId: 'qr' }
}

// ---- Email design system (table-based, inline styles — the only reliable way
// across clients). Mirrors the site: brand sage #5e6f54, ink header, soft
// muted text, rounded card. ----

const C = {
  brand: '#5e6f54', brandSoft: '#f4f7f1', ink: '#26302a', soft: '#586158',
  faint: '#98a29a', line: '#e3e7ea', bg: '#f4f6f8', mist: '#eef1f3',
}
// Signature sage gradient (with solid fallback for clients that ignore it).
const GRAD = 'background:#5e6f54;background-image:linear-gradient(135deg,#445236 0%,#5b6d50 55%,#74886a 100%);'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"

// The mail header's brand mark. MAIL_LOGO_URL points at a copy of the logo
// trimmed to its content box: the site logo is a square export whose wordmark
// fills about a fifth of the height, and the CSS crop the site uses for that
// (overflow-hidden on an oversized image) is ignored by Outlook, so mailing
// the site logo directly renders a few illegible pixels in a white box.
//
// Sized by height, on a white chip -- the header behind it is dark and logo
// exports are routinely opaque white-background files, which would otherwise
// read as a torn white rectangle. With no MAIL_LOGO_URL set this falls back to
// the text wordmark every template used before, so mail is never unbranded.
function brandMark(orgName: string, logoUrl?: string | null): string {
  const url = logoUrl || (process.env.MAIL_LOGO_URL ? siteUrl(process.env.MAIL_LOGO_URL) : '')
  const name = escapeHtml(orgName || 'BICTA')
  if (!url) {
    return `<span style="font-family:${FONT};font-size:23px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${name}<span style="color:${C.brand};">.</span></span>`
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="background:#ffffff;border-radius:8px;padding:7px 11px;">
      <img src="${escapeHtml(url)}" alt="${name}" height="30" style="display:block;height:30px;width:auto;border:0;outline:none;text-decoration:none;" />
    </td></tr></table>`
}

function shell(opts: { preheader?: string; body: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${opts.preheader ?? ''}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 28px rgba(15,23,42,0.08);">
        <tr><td style="height:6px;${GRAD}font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:${C.ink};padding:24px 34px;">
          <table role="presentation" width="100%"><tr>
            <td>${brandMark('BICTA')}</td>
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
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:12px;${GRAD}box-shadow:0 4px 14px rgba(56,67,47,0.4);">
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
        para(`<span style="font-size:13px;color:${C.faint}">This link works once and expires in 24 hours. After that your place on the team is released.</span>`) +
        qrBlock(),
    }),
    attachments: [await qrAttachment(opts.checkinToken)],
  }
}

// Leader's post-registration mail. Setting the password through this link is
// both the activation step and the proof they own the address, so there is no
// separate "verify your email" round trip.
export async function leaderSetPasswordEmail(opts: { name: string; teamName: string; competition: string; inviteToken: string; checkinToken: string }) {
  const link = siteUrl(`/portal/set-password?token=${opts.inviteToken}`)
  return {
    subject: `Set your password — ${opts.competition}`,
    html: shell({
      preheader: `Choose a password to activate your BICTA account and dashboard.`,
      body:
        heading(`One step left, ${opts.name}`) +
        para(`Your registration for <strong style="color:${C.ink}">${opts.competition}</strong> is almost done. Choose a password to activate your account and unlock your dashboard.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;">${infoRow('Competition', opts.competition)}${opts.teamName ? infoRow('Team', opts.teamName) : ''}</table>` +
        button(link, 'Set my password') +
        para(`<span style="font-size:13px;color:${C.faint}">This link works once and expires in 24 hours. After that your place is released and you will need to register again.</span>`) +
        qrBlock(),
    }),
    attachments: [await qrAttachment(opts.checkinToken)],
  }
}

export async function leaderConfirmationEmail(opts: { name: string; teamName: string; competition: string; checkinToken: string }) {
  const link = siteUrl('/login')
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

export function applicationConfirmedEmail(opts: { name: string; teamName: string; competition: string; note?: string | null }) {
  const link = siteUrl('/portal')
  return {
    subject: `You're confirmed — ${opts.competition}`,
    html: shell({
      preheader: `Your application for ${opts.competition} was accepted.`,
      body:
        heading(`Great news, ${opts.name}!`) +
        para(`Your application for <strong style="color:${C.ink}">${opts.competition}</strong> has been <strong style="color:${C.ink}">accepted</strong>.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;">${infoRow('Competition', opts.competition)}${opts.teamName ? infoRow('Team', opts.teamName) : ''}</table>` +
        (opts.note ? para(`<em>"${opts.note}"</em>`) : '') +
        button(link, 'Open my dashboard'),
    }),
  }
}

export function applicationRejectedEmail(opts: { name: string; teamName: string; competition: string; note?: string | null }) {
  const link = siteUrl('/portal')
  return {
    subject: `Update on your application — ${opts.competition}`,
    html: shell({
      preheader: `An update on your application for ${opts.competition}.`,
      body:
        heading(`Hi ${opts.name}`) +
        para(`Your application for <strong style="color:${C.ink}">${opts.competition}</strong> was not accepted this time.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;">${infoRow('Competition', opts.competition)}${opts.teamName ? infoRow('Team', opts.teamName) : ''}</table>` +
        (opts.note ? para(`<em>"${opts.note}"</em>`) : '') +
        button(link, 'View my dashboard'),
    }),
  }
}

// Volunteer / moderator console invite. Nobody hands out a password: the
// person sets their own through this link, which is also what proves they own
// the address.
export function staffInviteEmail(opts: { name: string; inviteToken: string; role: 'volunteer' | 'moderator' }) {
  const link = siteUrl(`/staff/set-password?token=${opts.inviteToken}`)
  const isVolunteer = opts.role === 'volunteer'
  return {
    subject: isVolunteer ? "You're on the BICTA event-day team" : 'You have been added as a BICTA moderator',
    html: shell({
      preheader: 'Set your password to activate your BICTA staff account.',
      body:
        heading(`Welcome, ${opts.name}!`) +
        para(
          isVolunteer
            ? 'You have been added as a BICTA event-day volunteer. Set a password to activate your account, then use the scanner to check participants in at the kit, food and snack desks.'
            : 'You have been added as a BICTA moderator. Set a password to activate your account and open the admin console.',
        ) +
        button(link, 'Set my password') +
        para(`<span style="font-size:13px;color:${C.faint}">This link works once and expires in 7 days. Until you use it you cannot sign in.</span>`),
    }),
  }
}

export function judgeInviteEmail(opts: { name: string; inviteToken: string }) {
  const link = siteUrl(`/judge/set-password?token=${opts.inviteToken}`)
  return {
    subject: "You've been invited to judge on BICTA",
    html: shell({
      preheader: 'Set your password to access the judge portal.',
      body:
        heading(`Welcome, ${opts.name}!`) +
        para('You have been invited to score competitions on BICTA. Set a password to access the judge portal, see your assigned competitions and enter marks for each team.') +
        button(link, 'Set my password') +
        para(`<span style="font-size:13px;color:${C.faint}">This link works once and expires in 7 days.</span>`),
    }),
  }
}

// ---- Admin broadcast mailer ----
//
// A different kind of email from everything above: an org-wide announcement
// an admin writes on the spot, not a fixed transactional notice. It gets its
// own header rather than reusing shell(), because shell()'s header is a
// hardcoded "BICTA" wordmark -- fine for the transactional flows above, which
// only ever ship as this codebase, but wrong for a feature whose whole point
// is to actually show the organisation's current uploaded logo and name.
// Every other visual (gradient strip, card, spacing, fonts) still matches the
// rest of the mail system.
export function broadcastEmail(opts: { subject: string; bodyHtml: string; logoUrl?: string | null; orgName: string }): { subject: string; html: string } {
  const orgName = escapeHtml(opts.orgName || 'BICTA')
  // MAIL_LOGO_URL wins over the site logo passed in: the site logo is the
  // padded square, which mails as an illegible smudge. brandMark() falls back
  // to the caller's logo, then to the text wordmark.
  const mark = process.env.MAIL_LOGO_URL
    ? brandMark(opts.orgName, null)
    : brandMark(opts.orgName, opts.logoUrl)

  // The rich-text body comes back from the admin editor as bare <p>/<h2>/<ul>
  // etc with no inline styles (sanitizeRichText strips style attributes), so
  // without this it would render as default black Times-ish text under a
  // branded header -- a visible seam. Gmail, Apple Mail and Outlook.com all
  // honour a <style> block in <head>; classic desktop Outlook mostly ignores
  // it and falls back to plain (still legible) text, which is an acceptable
  // degrade rather than a broken one.
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only">
<style>
  .mail-body p{margin:0 0 14px;}
  .mail-body h2{margin:20px 0 10px;font-size:19px;font-weight:800;color:${C.ink};}
  .mail-body h3{margin:18px 0 8px;font-size:16px;font-weight:800;color:${C.ink};}
  .mail-body h4{margin:16px 0 6px;font-size:14px;font-weight:800;color:${C.ink};}
  .mail-body ul,.mail-body ol{margin:0 0 14px;padding-left:20px;}
  .mail-body li{margin:0 0 6px;}
  .mail-body a{color:${C.brand};font-weight:700;}
  .mail-body blockquote{margin:0 0 14px;padding-left:14px;border-left:3px solid ${C.line};color:${C.faint};}
  .mail-body img{max-width:100%;height:auto;border-radius:8px;}
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 28px rgba(15,23,42,0.08);">
        <tr><td style="height:6px;${GRAD}font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:${C.ink};padding:22px 34px;">${mark}</td></tr>
        <tr><td class="mail-body" style="padding:34px 34px 30px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.soft};">${opts.bodyHtml}</td></tr>
        <tr><td style="padding:22px 34px;background:${C.mist};border-top:1px solid ${C.line};">
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};">You're receiving this from ${orgName}.</p>
        </td></tr>
      </table>
      <p style="font-family:${FONT};font-size:11px;color:${C.faint};margin:16px 0 0;">&copy; ${new Date().getFullYear()} ${orgName}</p>
    </td></tr>
  </table>
</body></html>`

  return { subject: opts.subject, html }
}
