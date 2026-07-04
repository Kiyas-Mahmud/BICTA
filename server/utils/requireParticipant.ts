import type { H3Event } from 'h3'

export interface ParticipantSessionUser {
  id: number
  fullName: string
  email: string
}

// Security boundary for /api/participant/** (except the public auth routes).
// Participants live in their own session key ("participant") so a participant
// session can never satisfy requireAdmin/requireStaff and vice versa.
export async function requireParticipant(event: H3Event): Promise<ParticipantSessionUser> {
  const session = await getUserSession(event)
  const participant = (session as any)?.participant as ParticipantSessionUser | undefined
  if (!participant?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return participant
}
