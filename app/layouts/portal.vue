<script setup lang="ts">
const { session, fetch: refreshSession } = useUserSession()
const participant = computed(() => (session.value as any)?.participant as { fullName: string; email: string } | undefined)

async function logout() {
  await $fetch('/api/participant/logout', { method: 'POST' })
  await refreshSession()
  await navigateTo('/portal/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-mist-1">
    <header class="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div class="container-site flex h-16 items-center justify-between">
        <NuxtLink to="/portal" class="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          BICTA<span class="text-brand-600">.</span>
          <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600">Participant</span>
        </NuxtLink>
        <div v-if="participant" class="flex items-center gap-4">
          <span class="hidden text-sm font-medium text-ink-soft sm:block">{{ participant.fullName }}</span>
          <button class="btn-secondary !px-4 !py-2 text-sm" @click="logout">
            <Icon name="lucide:log-out" /> Log out
          </button>
        </div>
        <NuxtLink v-else to="/" class="text-sm font-semibold text-ink-soft hover:text-ink">Back to site</NuxtLink>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
