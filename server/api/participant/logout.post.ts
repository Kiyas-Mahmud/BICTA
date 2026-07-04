export default defineEventHandler(async (event) => {
  // Remove only the participant part of the session; an admin logged into the
  // same browser keeps their staff session.
  const session = await getUserSession(event)
  const { participant: _drop, ...rest } = (session ?? {}) as Record<string, unknown>
  await replaceUserSession(event, rest)
  return { ok: true }
})
