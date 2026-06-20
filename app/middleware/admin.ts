// UX guard only — redirects unauthenticated users to the login page.
// The real security boundary is requireAdmin() in every /api/admin handler.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/admin/login') return

  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo('/admin/login')
  }
})
