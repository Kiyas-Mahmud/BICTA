import { useDb, schema } from '../../../database/client'
import { mailerSendSchema } from '../../../utils/validation'
import { sanitizeRichText } from '../../../utils/sanitize'
import { sendMail, broadcastEmail, siteUrl } from '../../../utils/email'
import { getSettings } from '../../../utils/queries'
import { recordAudit } from '../../../utils/audit'

// One send at a time, in small concurrent chunks, in this same request --
// there is no queue. Resend's REST API and Cloudflare's per-request
// subrequest budget both cap what a single invocation can push through, so
// MAX_RECIPIENTS keeps one click from trying to blast a list that would blow
// past either. An admin with a bigger list narrows the audience and sends in
// batches; that is a manual step worth having rather than a queue this scale
// does not need yet.
const MAX_RECIPIENTS = 500
const CONCURRENCY = 5

export default defineEventHandler(async (event) => {
  const actor = await requireMainAdmin(event)
  const body = await readValidatedBody(event, mailerSendSchema.parse)
  const db = useDb()

  let recipients: string[]
  if (body.audience === 'newsletter') {
    const rows = await db.select({ email: schema.newsletterSubscribers.email }).from(schema.newsletterSubscribers)
    recipients = rows.map((r) => r.email)
  } else if (body.audience === 'participants') {
    // Every registered account regardless of status: invited/pending accounts
    // still own the address, and an org-wide announcement (schedule change,
    // venue update) is exactly the kind of mail that should reach them too,
    // not just the ones who finished activating.
    const rows = await db.selectDistinct({ email: schema.participantAccounts.email }).from(schema.participantAccounts)
    recipients = rows.map((r) => r.email)
  } else {
    recipients = body.customEmails
  }
  recipients = [...new Set(recipients)]

  if (!recipients.length) {
    throw createError({ statusCode: 400, statusMessage: 'No recipients for this audience yet.' })
  }
  if (recipients.length > MAX_RECIPIENTS) {
    throw createError({
      statusCode: 400,
      statusMessage: `${recipients.length} recipients exceeds the ${MAX_RECIPIENTS}-per-send limit. Narrow the audience and send again.`,
    })
  }

  const settings = await getSettings()
  const bodyHtml = sanitizeRichText(body.message)
  const { subject, html } = broadcastEmail({
    subject: body.subject,
    bodyHtml,
    logoUrl: settings.site_logo_url ? siteUrl(settings.site_logo_url) : null,
    orgName: settings.brand_name || 'BICTA',
  })

  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY)
    const results = await Promise.all(chunk.map((to) => sendMail({ to, subject, html })))
    for (const ok of results) if (ok) sent++
    else failed++
  }

  const [campaign] = await db
    .insert(schema.mailCampaigns)
    .values({
      subject: body.subject,
      message: bodyHtml,
      audience: body.audience,
      recipientCount: recipients.length,
      sentCount: sent,
      failedCount: failed,
      sentByName: actor.name,
      sentByEmail: actor.email,
    })
    .returning()

  await recordAudit(actor, {
    action: 'notify',
    entity: 'mailer',
    entityId: campaign!.id,
    summary: `Sent "${body.subject}" to ${body.audience} (${sent}/${recipients.length} delivered)`,
  })

  return campaign
})
