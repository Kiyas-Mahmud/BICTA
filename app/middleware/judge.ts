// UX guard for the judge portal. The real boundary is requireJudge() on every
// /api/judge/** handler.
export default defineNuxtRouteMiddleware((to) => {
  const open = ['/judge/set-password']
  if (open.includes(to.path)) return

  const { session } = useUserSession()
  if (!(session.value as any)?.judge) {
    return navigateTo('/login')
  }
})
