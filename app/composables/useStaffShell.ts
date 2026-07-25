// Lets the scanner page hand the staff layout a teardown step (stopping the
// camera) that must run before the session is dropped on logout.
// Client-only by construction: the page registers inside onMounted.

let beforeLogout: (() => unknown | Promise<unknown>) | null = null

export function useStaffShell() {
  return {
    onBeforeLogout(fn: () => unknown | Promise<unknown>) {
      beforeLogout = fn
      onScopeDispose(() => {
        if (beforeLogout === fn) beforeLogout = null
      })
    },
    async runBeforeLogout() {
      try {
        await beforeLogout?.()
      } catch {
        // Teardown must never block signing out.
      }
    },
  }
}
