import type { H3Event } from 'h3'
import { useDb, schema } from '../database/client'
import type { StaffSessionUser } from './requireAdmin'

export type AuditAction = 'create' | 'update' | 'delete' | 'decide' | 'notify' | 'login'

interface AuditInput {
  action: AuditAction
  /** Subject type: 'competition' | 'event' | 'judge' | 'registration' | … */
  entity: string
  entityId?: number | null
  /**
   * Which event this action belonged to, when the caller knows. Captured here
   * rather than derived on read: entity/entityId is a loose pointer with no
   * FK, so after a delete the event is unrecoverable. Omit for genuinely
   * event-less actions (settings, moderators, login).
   */
  eventId?: number | null
  /** One readable line. Never put PII bodies or credentials in here. */
  summary?: string
}

/**
 * Append one line to the audit trail.
 *
 * Deliberately never throws: an audit write failing must not turn a completed
 * action into an error response for the user. A dropped log line is a smaller
 * problem than a moderator being told their save failed when it did not.
 *
 * Pass the actor returned by requireAdmin — the caller already has it, and
 * re-reading the session here would be a second lookup for no gain.
 */
export async function recordAudit(actor: StaffSessionUser, input: AuditInput): Promise<void> {
  try {
    await useDb()
      .insert(schema.auditLogs)
      .values({
        actorId: actor.id,
        actorName: actor.name ?? '',
        actorEmail: actor.email ?? '',
        actorRole: actor.role,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        eventId: input.eventId ?? null,
        summary: input.summary ?? '',
      })
  } catch (err: any) {
    console.error(`[audit] could not record ${input.action} ${input.entity}: ${err?.message ?? err}`)
  }
}

/** Convenience for handlers that only hold the H3 event. */
export async function auditFromEvent(event: H3Event, input: AuditInput): Promise<void> {
  const session = await getUserSession(event)
  const user = session?.user as StaffSessionUser | undefined
  if (!user?.id) return
  await recordAudit({ ...user, role: user.role ?? 'admin' }, input)
}
