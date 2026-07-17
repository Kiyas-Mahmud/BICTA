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
    error.value = e?.statusCode === 429 ? 'Too many attempts. Try again in a few minutes.' : 'Wrong email or password.'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: 'Participant login', robots: 'noindex' })
</script>

<template>
  <PortalAuthCard title="Participant login" subtitle="Your team, competition details and event-day QR code.">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="mb-1.5 block text-sm font-bold" for="email">Email</label>
        <div class="relative">
          <Icon name="lucide:mail" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input id="email" v-model="email" type="email" required autocomplete="username" class="field !pl-10" placeholder="you@email.com" />
        </div>
      </div>
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-sm font-bold" for="password">Password</label>
          <NuxtLink to="/portal/forgot" class="text-xs font-semibold text-brand-600 hover:underline">Forgot?</NuxtLink>
        </div>
        <PortalPasswordInput id="password" v-model="password" placeholder="Your password" />
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button type="submit" class="btn-primary w-full !py-3" :disabled="loading">
        <Icon v-if="loading" name="lucide:loader-2" class="animate-spin" />
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <div class="mt-6 rounded-xl bg-mist-1 p-4 text-center text-xs leading-relaxed text-ink-soft">
      New here? Register for a competition and your account is created automatically.<br />
      Invited by a team leader? Use the <strong>set-password link</strong> in your email.
      <NuxtLink to="/portal/forgot" class="font-semibold text-brand-600 hover:underline">Set a password</NuxtLink>
    </div>
    <p class="mt-4 text-center text-xs text-ink-faint">
      Are you an organizer? <NuxtLink to="/admin/login" class="font-semibold hover:text-ink">Admin login</NuxtLink>
    </p>
  </PortalAuthCard>
</template>
