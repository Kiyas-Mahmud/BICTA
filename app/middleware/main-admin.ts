// UX guard only — keeps moderators out of the main-admin screens (settings,
// moderators, activity log) so they never see a page that would just 403.
// The real boundary is requireMainAdmin() in the handlers behind them.
export default defineNuxtRouteMiddleware(() => {
  const { session } = useUserSession()
  const user = (session.value as any)?.user as { role?: string } | undefined
  if (user && user.role !== 'admin') {
    return navigateTo('/admin')
  }
})
