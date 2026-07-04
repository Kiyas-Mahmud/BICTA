import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../database/client'
import { checkinSchema } from '../../utils/validation'

// Mark one collectible as collected for one person. The unique
// (accountId, checkpointId) index is the double-collection guard.
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readValidatedBody(event, checkinSchema.parse)
  const db = useDb()

  const account = db
    .select({ id: schema.participantAccounts.id })
    .from(schema.participantAccounts)
    .where(eq(schema.participantAccounts.id, body.accountId))
    .get()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Participant not found' })

  const checkpoint = db.select().from(schema.checkpoints).where(eq(schema.checkpoints.id, body.checkpointId)).get()
  if (!checkpoint || !checkpoint.active) {
    throw createError({ statusCode: 404, statusMessage: 'Checkpoint not found or inactive' })
  }

  const inserted = await db
    .insert(schema.checkins)
    .values({ accountId: body.accountId, checkpointId: body.checkpointId, scannedBy: staff.id })
    .onConflictDoNothing()
    .returning()

  // result tells the scanner UI green vs amber.
  return { result: inserted.length ? 'collected' : 'already' }
})
