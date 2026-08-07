import { z } from 'zod'
import { and, desc, eq, like, or } from 'drizzle-orm'
import { useDb, schema } from '../../../database/client'

// Main admin only: the log exists to review what moderators did, so it must
// not be readable by the people it records.
const query = z.object({
  actorId: z.coerce.number().int().positive().optional(),
  entity: z.string().trim().max(40).optional(),
  action: z.string().trim().max(20).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  await requireMainAdmin(event)
  const { actorId, entity, action, q, limit, offset } = await getValidatedQuery(event, query.parse)
  const db = useDb()

  const rows = await db
    .select()
    .from(schema.auditLogs)
    .where(
      and(
        actorId ? eq(schema.auditLogs.actorId, actorId) : undefined,
        entity ? eq(schema.auditLogs.entity, entity) : undefined,
        action ? eq(schema.auditLogs.action, action) : undefined,
        q
          ? or(
              like(schema.auditLogs.summary, `%${q}%`),
              like(schema.auditLogs.actorName, `%${q}%`),
              like(schema.auditLogs.actorEmail, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(schema.auditLogs.id))
    .limit(limit)
    .offset(offset)

  // Distinct actors and entity types, so the UI can offer real filter options
  // instead of a hardcoded list that drifts from what is actually logged.
  const actors = await db
    .selectDistinct({ id: schema.auditLogs.actorId, name: schema.auditLogs.actorName, role: schema.auditLogs.actorRole })
    .from(schema.auditLogs)
  const entities = await db.selectDistinct({ entity: schema.auditLogs.entity }).from(schema.auditLogs)

  return {
    rows,
    // One page past the end tells the UI whether to show "load more".
    hasMore: rows.length === limit,
    actors: actors.filter((a) => a.id !== null),
    entities: entities.map((e) => e.entity).sort(),
  }
})
