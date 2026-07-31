import type { H3Event } from 'h3'

export interface JudgeSessionUser {
  id: number
  personId: number
  fullName: string
  email: string
}

// Security boundary for /api/judge/** (except set-password/logout). Judges
// live in their own session key ("judge") so a judge session can never
// satisfy requireAdmin/requireStaff/requireParticipant and vice versa.
export async function requireJudge(event: H3Event): Promise<JudgeSessionUser> {
  const session = await getUserSession(event)
  const judge = (session as any)?.judge as JudgeSessionUser | undefined
  if (!judge?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return judge
}
