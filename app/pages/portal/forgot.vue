<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'participant' })

const email = ref('')
const website = ref('') // honeypot
const formToken = ref('')
onMounted(() => { formToken.value = String(Date.now()) })

const done = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/participant/forgot', {
      method: 'POST',
      body: { email: email.value, website: website.value, formToken: formToken.value },
    })
    done.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: 'Reset password', robots: 'noindex' })
</script>

<template>
  <PortalAuthCard title="Set / reset password" subtitle="Enter your registered email and we'll send a link to set a new password.">
    <div v-if="done" class="text-center">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
        <Icon name="lucide:mail-check" class="text-2xl" />
      </span>
      <p class="mt-4 font-bold">Check your email</p>
      <p class="mt-1 text-sm text-ink-soft">If that address is registered, a reset link is on its way.</p>
      <NuxtLink to="/portal/login" class="btn-secondary mt-6">Back to login</NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="mb-1.5 block text-sm font-bold" for="email">Email</label>
        <input id="email" v-model="email" type="email" required autocomplete="username" class="field" />
      </div>
      <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label for="website">Website</label>
        <input id="website" v-model="website" tabindex="-1" autocomplete="off" />
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button type="submit" class="btn-primary w-full !py-3" :disabled="loading">
        {{ loading ? 'Sending…' : 'Send reset link' }}
      </button>
      <NuxtLink to="/portal/login" class="block text-center text-xs font-semibold text-ink-soft hover:text-ink">Back to login</NuxtLink>
    </form>
  </PortalAuthCard>
</template>
