import { desc, eq, and, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { useDb, schema } from '../../../database/client'

const querySchema = z.object({
  competitionId: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'confirmed', 'rejected']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()

  const filters: SQL[] = []
  if (q.competitionId) filters.push(eq(schema.registrations.competitionId, q.competitionId))
  if (q.status) filters.push(eq(schema.registrations.status, q.status))

  return db
    .select({
      id: schema.registrations.id,
      competitionId: schema.registrations.competitionId,
      competitionName: schema.competitions.name,
      fullName: schema.registrations.fullName,
      email: schema.registrations.email,
      phone: schema.registrations.phone,
      institution: schema.registrations.institution,
      teamName: schema.registrations.teamName,
      teamMembers: schema.registrations.teamMembers,
      notes: schema.registrations.notes,
      status: schema.registrations.status,
      createdAt: schema.registrations.createdAt,
    })
    .from(schema.registrations)
    .innerJoin(schema.competitions, eq(schema.competitions.id, schema.registrations.competitionId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.registrations.createdAt))
})
