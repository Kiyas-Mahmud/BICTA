export default defineEventHandler(async (event) => {
  // Fully clear the sealed session cookie. We used to strip only the
  // `participant` key via replaceUserSession(), but h3's useSession re-reads the
  // original request cookie inside update() after clear(), so the participant
  // was resealed and logout silently did nothing. clearUserSession() empties the
  // cookie outright — the reliable logout path (same as admin logout).
  await clearUserSession(event)
  return { ok: true }
})
