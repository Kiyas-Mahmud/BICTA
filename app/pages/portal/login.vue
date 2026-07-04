<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'participant' })

const { session, fetch: refreshSession } = useUserSession()
if ((session.value as any)?.participant) {
  await navigateTo('/portal')
}

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/participant/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo('/portal')
  } catch (e: any) {
    error.value = e?.statusCode === 429 ? 'Too many attempts. Try again later.' : 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: 'Participant login', robots: 'noindex' })
</script>

<template>
  <PortalAuthCard title="Participant login" subtitle="See your team, competition and event-day QR code.">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="mb-1.5 block text-sm font-bold" for="email">Email</label>
        <input id="email" v-model="email" type="email" required autocomplete="username" class="field" />
      </div>
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-sm font-bold" for="password">Password</label>
          <NuxtLink to="/portal/forgot" class="text-xs font-semibold text-brand-600 hover:underline">Forgot?</NuxtLink>
        </div>
        <input id="password" v-model="password" type="password" required autocomplete="current-password" class="field" />
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button type="submit" class="btn-primary w-full !py-3" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
    <p class="mt-5 text-center text-xs text-ink-soft">
      Registered but no password yet? Check your email for the invite link, or
      <NuxtLink to="/portal/forgot" class="font-semibold text-brand-600 hover:underline">set one here</NuxtLink>.
    </p>
  </PortalAuthCard>
</template>
