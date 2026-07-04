// UX guard for the participant portal. The real boundary is
// requireParticipant() on every /api/participant/** handler.
export default defineNuxtRouteMiddleware((to) => {
  // Public portal routes (auth pages) are always reachable.
  const open = ['/portal/login', '/portal/forgot', '/portal/reset', '/portal/set-password']
  if (open.includes(to.path)) return

  const { session } = useUserSession()
  if (!(session.value as any)?.participant) {
    return navigateTo('/portal/login')
  }
})
