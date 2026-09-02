<script setup lang="ts">
// Volunteer shell: dark, high-contrast and thumb-friendly — it is used on a
// phone, at a booth, often in bright light.
const { session } = useUserSession()
const staff = computed(() => (session.value as any)?.user as { name: string; email?: string; role?: string } | undefined)
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })

const { runBeforeLogout } = useStaffShell()
const loggingOut = ref(false)
const menuOpen = ref(false)

// Volunteers notice a dropped connection long before a failed scan explains it.
const online = ref(true)
function syncOnline() {
  online.value = navigator.onLine
}
onMounted(() => {
  syncOnline()
  window.addEventListener('online', syncOnline)
  window.addEventListener('offline', syncOnline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', syncOnline)
  window.removeEventListener('offline', syncOnline)
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  await runBeforeLogout()
  await $fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {})
  // Hard reload avoids the client session-ref race that can stall the redirect.
  window.location.href = '/login'
}
</script>

<template>
  <div class="scan-shell flex min-h-screen flex-col text-white">
    <header class="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-md">
      <div class="mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4">
        <p class="flex items-center gap-2 font-extrabold tracking-tight">
          <!-- Light chip: this header is dark and uploaded logos are usually
               opaque white-background PNGs. -->
          <span v-if="settings?.site_logo_url" class="flex items-center rounded-lg bg-white p-1">
            <span class="flex h-6 w-24 items-center overflow-hidden">
              <img :src="settings.site_logo_url" :alt="settings?.brand_name || 'BICTA'" class="w-24 max-w-none object-contain" />
            </span>
          </span>
          <span v-else class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/25 text-brand-300">
            <Icon name="lucide:scan-line" />
          </span>
          <span v-if="!settings?.site_logo_url">{{ settings?.brand_name || 'BICTA' }} </span><span class="text-white/50">Scanner</span>
        </p>

        <span
          v-if="!online"
          class="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200"
        >
          <Icon name="lucide:wifi-off" class="text-sm" /> Offline
        </span>

        <div class="relative ml-auto" :class="{ '!ml-2': !online }">
          <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />
          <button
            class="relative z-50 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-1.5 pl-2 pr-2.5 transition-colors hover:bg-white/[0.12]"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/30 text-[0.65rem] font-bold text-white">
              {{ initialsOf(staff?.name || staff?.email) }}
            </span>
            <span class="hidden max-w-[9rem] truncate text-sm font-semibold sm:block">{{ staff?.name }}</span>
            <Icon name="lucide:chevron-down" class="text-white/50 transition-transform duration-200" :class="{ 'rotate-180': menuOpen }" />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out" enter-from-class="-translate-y-1 opacity-0"
            leave-active-class="transition duration-100 ease-in" leave-to-class="-translate-y-1 opacity-0"
          >
            <div
              v-if="menuOpen"
              class="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#1f2721] py-1.5 shadow-lift"
              role="menu"
            >
              <div class="border-b border-white/10 px-4 pb-2.5 pt-1.5">
                <p class="truncate text-sm font-bold">{{ staff?.name }}</p>
                <p class="truncate text-xs capitalize text-white/50">{{ staff?.role ?? 'volunteer' }}</p>
              </div>
              <button
                role="menuitem"
                class="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-red-300 transition-colors hover:bg-white/[0.08]"
                :disabled="loggingOut"
                @click="logout"
              >
                <Icon :name="loggingOut ? 'lucide:loader-2' : 'lucide:log-out'" :class="{ 'animate-spin': loggingOut }" />
                {{ loggingOut ? 'Signing out…' : 'Log out' }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-4">
      <slot />
    </main>

    <AdminToaster />
  </div>
</template>
