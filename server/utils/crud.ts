import { asc, eq } from 'drizzle-orm'
import type { ZodSchema } from 'zod'
import { useDb } from '../database/client'
import { sanitizeRichText } from './sanitize'
import { idParam } from './validation'

// Generic admin CRUD handlers for the simple home-page list tables. Each Nitro
// route file is a one-liner that calls one of these. Every handler enforces the
// locked skeleton: requireAdmin -> Zod parse -> Drizzle op -> return row.
// `table` is a Drizzle SQLite table; loose typing keeps the factory reusable.

interface Opts {
  /* rich-text fields to run through sanitizeRichText on write */
  richFields?: string[]
}

export function listHandler(table: any, orderCol: any) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)
    return useDb().select().from(table).orderBy(asc(orderCol))
  })
}

export function createHandler(table: any, schema: ZodSchema, opts: Opts = {}) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)
    const body: any = await readValidatedBody(event, schema.parse)
    for (const f of opts.richFields ?? []) if (body[f]) body[f] = sanitizeRichText(body[f])
    const [row] = await useDb().insert(table).values(body).returning()
    return row
  })
}

export function updateHandler(table: any, idCol: any, schema: ZodSchema, opts: Opts = {}) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)
    const id = idParam.parse(getRouterParam(event, 'id'))
    const body: any = await readValidatedBody(event, schema.parse)
    for (const f of opts.richFields ?? []) if (body[f]) body[f] = sanitizeRichText(body[f])
    const [row] = await useDb().update(table).set(body).where(eq(idCol, id)).returning()
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return row
  })
}

export function deleteHandler(table: any, idCol: any) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)
    const id = idParam.parse(getRouterParam(event, 'id'))
    await useDb().delete(table).where(eq(idCol, id))
    return { ok: true }
  })
}
