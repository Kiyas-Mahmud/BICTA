import { randomUUID } from 'node:crypto'
import { eq, and, asc } from 'drizzle-orm'
import { useDb, schema } from '../../../../database/client'
import { idParam, applicationEditSchema } from '../../../../utils/validation'
import { requireTeamLeader } from '../../../../utils/team'
import { useUploads, contentTypeFor, APPLICATION_PREFIX } from '../../../../utils/storage'
import { sniffApplicationFile, APPLICATION_MAX_SIZE } from '../../../../utils/fileSniff'

// Leader-only, and only while the application is still 'pending' — once an
// admin decides (confirmed/rejected), or the registration deadline passes
// (enforced inside requireTeamLeader), the submission is locked.
export default defineEventHandler(async (event) => {
  const registrationId = idParam.parse(getRouterParam(event, 'id'))
  const { registration, comp } = await requireTeamLeader(event, registrationId)
  if (registration.status !== 'pending') {
    throw createError({ statusCode: 403, statusMessage: 'An admin has already decided this application — it can no longer be edited.' })
  }

  const contentType = getHeader(event, 'content-type') ?? ''
  const fileParts = new Map<number, { data: Buffer; filename: string }>()
  let body: ReturnType<typeof applicationEditSchema.parse>
  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    const payloadPart = parts?.find((p) => p.name === 'payload')
    let parsed: unknown = {}
    if (payloadPart) {
      try {
        parsed = JSON.parse(payloadPart.data.toString('utf8'))
      } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid form payload' })
      }
    }
    body = applicationEditSchema.parse(parsed)
    for (const p of parts ?? []) {
      if (p.name?.startsWith('file_') && p.data?.length) {
        const fieldId = Number(p.name.slice('file_'.length))
        if (Number.isInteger(fieldId)) fileParts.set(fieldId, { data: p.data, filename: p.filename ?? 'upload' })
      }
    }
  } else {
    body = await readValidatedBody(event, applicationEditSchema.parse)
  }

  const db = useDb()
  const fields = await db
    .select()
    .from(schema.applicationFields)
    .where(eq(schema.applicationFields.competitionId, comp.id))
    .orderBy(asc(schema.applicationFields.sortOrder))

  const existing = await db.select().from(schema.applicationResponses).where(eq(schema.applicationResponses.registrationId, registrationId))
  const existingByField = new Map(existing.map((r) => [r.fieldId, r]))
  const answerByFieldId = new Map(body.answers.map((a) => [a.fieldId, a.value]))

  // Validate in memory before any I/O: a required field is satisfied by
  // either a new answer/file in this request, or an already-stored one.
  const sniffedFiles = new Map<number, { data: Buffer; ext: string; mime: string; filename: string }>()
  for (const field of fields) {
    if (field.fieldType === 'file') {
      const part = fileParts.get(field.id)
      if (part) {
        if (part.data.length > APPLICATION_MAX_SIZE) {
          throw createError({ statusCode: 413, statusMessage: `${field.label}: file too large (max 10 MB).` })
        }
        const sniffed = sniffApplicationFile(part.data)
        if (!sniffed) {
          throw createError({ statusCode: 415, statusMessage: `${field.label}: only PDF, DOC, DOCX, JPG, PNG or WEBP files are allowed.` })
        }
        sniffedFiles.set(field.id, { data: part.data, ext: sniffed.ext, mime: sniffed.mime, filename: part.filename })
      } else if (field.required && !existingByField.get(field.id)?.fileUrl) {
        throw createError({ statusCode: 400, statusMessage: `${field.label} is required.` })
      }
    } else {
      const hasNew = answerByFieldId.has(field.id)
      const value = hasNew ? answerByFieldId.get(field.id)?.trim() : existingByField.get(field.id)?.textValue
      if (field.required && !value) {
        throw createError({ statusCode: 400, statusMessage: `${field.label} is required.` })
      }
    }
  }

  const uploads = useUploads(event)
  const uploadedFiles = new Map<number, { url: string; filename: string; size: number; mime: string }>()
  if (sniffedFiles.size) {
    try {
      for (const [fieldId, file] of sniffedFiles) {
        const key = `${randomUUID()}.${file.ext}`
        await uploads.put(`${APPLICATION_PREFIX}${key}`, file.data, { httpMetadata: { contentType: contentTypeFor(key) } })
        uploadedFiles.set(fieldId, { url: `/applications/${key}`, filename: file.filename, size: file.data.length, mime: file.mime })
      }
    } catch {
      await Promise.all([...uploadedFiles.values()].map((f) => uploads.delete(`${APPLICATION_PREFIX}${f.url.split('/').pop()}`).catch(() => {})))
      throw createError({ statusCode: 500, statusMessage: 'Could not upload your file. Please try again.' })
    }
  }

  const statements = []
  for (const field of fields) {
    if (field.fieldType === 'file') {
      const file = uploadedFiles.get(field.id)
      if (!file) continue
      statements.push(
        db
          .insert(schema.applicationResponses)
          .values({ registrationId, fieldId: field.id, fileUrl: file.url, fileName: file.filename, fileSize: file.size, fileMime: file.mime })
          .onConflictDoUpdate({
            target: [schema.applicationResponses.registrationId, schema.applicationResponses.fieldId],
            set: { fileUrl: file.url, fileName: file.filename, fileSize: file.size, fileMime: file.mime, updatedAt: new Date().toISOString() },
          }),
      )
    } else if (answerByFieldId.has(field.id)) {
      const value = answerByFieldId.get(field.id)!.trim()
      statements.push(
        db
          .insert(schema.applicationResponses)
          .values({ registrationId, fieldId: field.id, textValue: value || null })
          .onConflictDoUpdate({
            target: [schema.applicationResponses.registrationId, schema.applicationResponses.fieldId],
            set: { textValue: value || null, updatedAt: new Date().toISOString() },
          }),
      )
    }
  }
  if (statements.length) {
    await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]])
  }

  // Only delete an old file after its replacement is safely committed.
  await Promise.all(
    [...uploadedFiles.keys()].map((fieldId) => {
      const old = existingByField.get(fieldId)?.fileUrl
      if (!old) return Promise.resolve()
      return uploads.delete(`${APPLICATION_PREFIX}${old.split('/').pop()}`).catch(() => {})
    }),
  )

  return { ok: true }
})
