<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'participant' })

const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))
const { fetch: refreshSession } = useUserSession()

const state = ref<'checking' | 'done' | 'error'>('checking')
const error = ref('')

onMounted(async () => {
  if (!token.value) {
    state.value = 'error'
    error.value = 'This link is missing its token. Please use the button from your email.'
    return
  }
  try {
    await $fetch('/api/participant/verify', { method: 'POST', body: { token: token.value } })
    await refreshSession()
    state.value = 'done'
    await navigateTo('/portal')
  } catch (e: any) {
    state.value = 'error'
    error.value = e?.data?.statusMessage ?? 'This link is invalid or has expired.'
  }
})

// ---- Resend, right where the failure happened ----
const resendEmail = ref('')
const website = ref('') // honeypot
const formToken = ref('')
onMounted(() => { formToken.value = String(Date.now()) })
const resendSent = ref(false)
const resendLoading = ref(false)

async function resend() {
  resendLoading.value = true
  try {
    await $fetch('/api/participant/resend-verify', {
      method: 'POST',
      body: { email: resendEmail.value, website: website.value, formToken: formToken.value },
    })
    resendSent.value = true
  } finally {
    resendLoading.value = false
  }
}

useSeoMeta({ title: 'Verify your email', robots: 'noindex' })
</script>

<template>
  <PortalAuthCard title="Verifying your email" subtitle="Confirming this is you.">
    <div v-if="state === 'checking'" class="flex items-center justify-center gap-2.5 py-4 text-sm text-ink-soft">
      <Icon name="lucide:loader-2" class="animate-spin text-lg" /> Checking your link…
    </div>

    <div v-else-if="state === 'error'" class="space-y-5">
      <p class="form-error">{{ error }}</p>

      <div v-if="resendSent" class="text-center">
        <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
          <Icon name="lucide:mail-check" class="text-xl" />
        </span>
        <p class="mt-3 text-sm text-ink-soft">If that address has a pending account, a fresh link is on its way.</p>
      </div>

      <form v-else class="space-y-3" @submit.prevent="resend">
        <p class="text-sm text-ink-soft">Enter the email you registered with and we'll send a new verification link.</p>
        <input v-model="resendEmail" type="email" required autocomplete="username" placeholder="you@example.com" class="field" />
        <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
          <label for="website">Website</label>
          <input id="website" v-model="website" tabindex="-1" autocomplete="off" />
        </div>
        <button type="submit" class="btn-primary w-full !py-3" :disabled="resendLoading">
          {{ resendLoading ? 'Sending…' : 'Send new link' }}
        </button>
      </form>

      <NuxtLink to="/login" class="block text-center text-xs font-semibold text-ink-soft hover:text-ink">Back to sign in</NuxtLink>
    </div>
  </PortalAuthCard>
</template>
