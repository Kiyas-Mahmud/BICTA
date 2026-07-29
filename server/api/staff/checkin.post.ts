import { eq, and } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { checkinSchema } from '../../utils/validation'
import { allowedCompetitionIds } from '../../utils/volunteerScope'

// Mark one collectible as collected for one person. The unique
// (accountId, checkpointId) index is the double-collection guard.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readValidatedBody(event, checkinSchema.parse)
  const db = useDb()

  const account = await db
    .select({ id: schema.participantAccounts.id })
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.id, body.accountId))
    .get()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Participant not found' })

  const checkpoint = await db.select().from(schema.checkpoints).where(eq(schema.checkpoints.id, body.checkpointId)).get()
  if (!checkpoint || !checkpoint.active) {
    throw createError({ statusCode: 404, statusMessage: 'Checkpoint not found or inactive' })
  }

  // A scoped volunteer may only work their own competitions' desks. Checked
  // server-side because hiding the desk in the UI is not a control.
  const allowed = await allowedCompetitionIds(event, staff)
  if (allowed && checkpoint.competitionId && !allowed.includes(checkpoint.competitionId)) {
    throw createError({ statusCode: 403, statusMessage: 'This check-in point is not part of your assignment.' })
  }

  // Attribute the pickup to a competition: the desk's own where it has one,
  // otherwise whichever of the participant's teams is in scope.
  let competitionId = checkpoint.competitionId ?? null
  if (!competitionId) {
    const membership = await db
      .select({ competitionId: schema.teamMembers.competitionId })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.accountId, body.accountId))
      .get()
    competitionId = membership?.competitionId ?? null
  }

  // A competition-specific desk must only serve that competition's people.
  if (checkpoint.competitionId) {
    const onTeam = await db
      .select({ id: schema.teamMembers.id })
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.accountId, body.accountId),
          eq(schema.teamMembers.competitionId, checkpoint.competitionId),
        ),
      )
      .get()
    if (!onTeam) {
      throw createError({ statusCode: 403, statusMessage: 'This participant is not registered for that competition.' })
    }
  }

  const inserted = await db
    .insert(schema.checkins)
    .values({ accountId: body.accountId, checkpointId: body.checkpointId, competitionId, scannedBy: staff.id })
    .onConflictDoNothing()
    .returning()

  // result tells the scanner UI green vs amber.
  return { result: inserted.length ? 'collected' : 'already' }
})
