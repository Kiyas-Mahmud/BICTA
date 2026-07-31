export default defineEventHandler(async (event) => {
  // Full clear, not a surgical removal of just the `judge` key — see
  // server/api/participant/logout.post.ts for why a partial clear is unreliable.
  await clearUserSession(event)
  return { ok: true }
})
