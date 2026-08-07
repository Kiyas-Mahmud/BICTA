import { asc, eq } from 'drizzle-orm'
import type { ZodSchema } from 'zod'
import { useDb } from '../database/client'
import { sanitizeRichText } from './sanitize'
import { idParam } from './validation'
import { recordAudit } from './audit'

// Generic admin CRUD handlers for the simple home-page list tables. Each Nitro
// route file is a one-liner that calls one of these. Every handler enforces the
// locked skeleton: requireAdmin -> Zod parse -> Drizzle op -> audit -> return row.
// `table` is a Drizzle SQLite table; loose typing keeps the factory reusable.

interface Opts {
  /* rich-text fields to run through sanitizeRichText on write */
  richFields?: string[]
  /**
   * Audit subject name, e.g. 'sponsor'. Omit to skip logging — appropriate for
   * tables where the log would be pure noise. Writes are logged centrally here
   * so every collection built on this factory is covered by construction,
   * rather than relying on each new route file remembering to opt in.
   */
  entity?: string
  /** Picks the human label out of a row, for the log line. */
  label?: (row: any) => string
}

const labelOf = (opts: Opts, row: any) =>
  opts.label?.(row) ?? row?.name ?? row?.title ?? row?.label ?? row?.question ?? `#${row?.id}`

/**
 * Event scope for the audit line, derived generically: any table that carries
 * an eventId column (announcements, schedule, criteria, event-prizes,
 * timeline, gallery) is scoped automatically, so no per-route edit is needed
 * and a new event-scoped collection is covered the day it is added.
 */
const eventIdOf = (row: any, body?: any): number | null =>
  (typeof row?.eventId === 'number' ? row.eventId : undefined) ??
  (typeof body?.eventId === 'number' ? body.eventId : undefined) ??
  null

export function listHandler(table: any, orderCol: any) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)
    return useDb().select().from(table).orderBy(asc(orderCol))
  })
}

export function createHandler(table: any, schema: ZodSchema, opts: Opts = {}) {
  return defineEventHandler(async (event) => {
    const actor = await requireAdmin(event)
    const body: any = await readValidatedBody(event, schema.parse)
    for (const f of opts.richFields ?? []) if (body[f]) body[f] = sanitizeRichText(body[f])
    const [row] = await useDb().insert(table).values(body).returning()
    if (opts.entity) {
      await recordAudit(actor, { action: 'create', entity: opts.entity, entityId: row?.id, eventId: eventIdOf(row, body), summary: `Added ${opts.entity} "${labelOf(opts, row)}"` })
    }
    return row
  })
}

export function updateHandler(table: any, idCol: any, schema: ZodSchema, opts: Opts = {}) {
  return defineEventHandler(async (event) => {
    const actor = await requireAdmin(event)
    const id = idParam.parse(getRouterParam(event, 'id'))
    const body: any = await readValidatedBody(event, schema.parse)
    for (const f of opts.richFields ?? []) if (body[f]) body[f] = sanitizeRichText(body[f])
    const [row] = await useDb().update(table).set(body).where(eq(idCol, id)).returning()
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    if (opts.entity) {
      await recordAudit(actor, { action: 'update', entity: opts.entity, entityId: id, eventId: eventIdOf(row, body), summary: `Edited ${opts.entity} "${labelOf(opts, row)}"` })
    }
    return row
  })
}

export function deleteHandler(table: any, idCol: any, opts: Opts = {}) {
  return defineEventHandler(async (event) => {
    const actor = await requireAdmin(event)
    const id = idParam.parse(getRouterParam(event, 'id'))
    // Read first so the log line can name what went, not just its id.
    const existing = opts.entity ? await useDb().select().from(table).where(eq(idCol, id)).get() : null
    await useDb().delete(table).where(eq(idCol, id))
    if (opts.entity) {
      await recordAudit(actor, { action: 'delete', entity: opts.entity, entityId: id, eventId: eventIdOf(existing), summary: `Deleted ${opts.entity} "${labelOf(opts, existing)}"` })
    }
    return { ok: true }
  })
}
