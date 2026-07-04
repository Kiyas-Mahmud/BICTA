import { randomBytes } from 'node:crypto'
import { eq, count } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { teamMemberAddSchema, idParam } from '../../../../utils/validation'
import { requireTeamLeader, syncLegacyRoster } from '../../../../utils/team'
import { sendMail, inviteEmail, leaderConfirmationEmail } from '../../../../utils/email'
import { qrDataUrl } from '../../../../utils/qr'

// Leader adds a teammate after registration (until the deadline).
export default defineEventHandler(async (event) => {
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const { registration, comp } = await requireTeamLeader(event, registrationId)
  const body = await readValidatedBody(event, teamMemberAddSchema.parse)
  const db = useDb()

  const [{ n: rosterSize }] = await db
    .select({ n: count() })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.registrationId, registrationId))
  if (rosterSize >= comp.maxTeamSize) {
    throw createError({ statusCode: 400, statusMessage: `Teams may have at most ${comp.maxTeamSize} members including the leader.` })
  }

  let account = db.select().from(schema.participantAccounts).where(eq(schema.participantAccounts.email, body.email)).get()
  if (!account) {
    ;[account] = await db
      .insert(schema.participantAccounts)
      .values({
        email: body.email,
        fullName: body.name,
        status: 'invited',
        inviteToken: randomBytes(32).toString('hex'),
        checkinToken: randomBytes(24).toString('hex'),
      })
      .returning()
  }

  const inserted = await db
    .insert(schema.teamMembers)
    .values({ registrationId, accountId: account!.id, role: 'member' })
    .onConflictDoNothing()
    .returning()
  if (!inserted.length) {
    throw createError({ statusCode: 409, statusMessage: 'This person is already on the team.' })
  }

  await syncLegacyRoster(registrationId)

  const mail = account!.inviteToken
    ? inviteEmail({
        name: body.name,
        teamName: registration.teamName ?? '',
        competition: comp.name,
        inviteToken: account!.inviteToken,
        qrDataUrl: await qrDataUrl(account!.checkinToken),
      })
    : leaderConfirmationEmail({
        name: body.name,
        teamName: registration.teamName ?? '',
        competition: comp.name,
        qrDataUrl: await qrDataUrl(account!.checkinToken),
      })
  sendMail({ to: account!.email, ...mail }).catch(() => {})

  return { ok: true }
})
