<script setup lang="ts">
const { session } = useUserSession()
const judge = computed(() => (session.value as any)?.judge as { fullName: string; email: string } | undefined)
const { data: settings } = await useFetch('/api/public/settings', { key: 'site-settings' })

const loggingOut = ref(false)
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  await $fetch('/api/judge/logout', { method: 'POST' }).catch(() => {})
  // Hard navigation: the server has dropped the session, so a full reload
  // lands on the login page with fresh state — same reasoning as the
  // participant portal's logout.
  window.location.href = '/login'
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-mist-1">
    <header class="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div class="container-site flex h-16 items-center justify-between">
        <NuxtLink to="/judge" class="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span v-if="settings?.site_logo_url" class="flex h-8 w-32 items-center overflow-hidden">
            <img :src="settings.site_logo_url" :alt="settings?.brand_name || 'BICTA'" class="w-32 max-w-none object-contain" />
          </span>
          <span v-else>{{ settings?.brand_name || 'BICTA' }}<span class="text-brand-600">.</span></span>
          <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600">Judge</span>
        </NuxtLink>
        <div v-if="judge" class="flex items-center gap-4">
          <span class="hidden text-sm font-medium text-ink-soft sm:block">{{ judge.fullName }}</span>
          <button class="btn-secondary !px-4 !py-2 text-sm" :disabled="loggingOut" @click="logout">
            <Icon :name="loggingOut ? 'lucide:loader-2' : 'lucide:log-out'" :class="{ 'animate-spin': loggingOut }" />
            {{ loggingOut ? 'Signing out…' : 'Log out' }}
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
