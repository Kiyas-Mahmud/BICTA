<script setup lang="ts">
// Used by both /portal/set-password (invite) and /portal/reset. Same shape,
// different endpoint. On success the server logs the user in, so we refresh
// the session and go to the dashboard.
const props = defineProps<{ endpoint: string; token: string }>()

const { fetch: refreshSession } = useUserSession()

const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await $fetch(props.endpoint, { method: 'POST', body: { token: props.token, password: password.value } })
    await refreshSession()
    await navigateTo('/portal')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'This link is invalid or has expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="!token" class="text-center text-sm text-ink-soft">
    This link is missing its token. Please use the button from your email.
  </div>
  <form v-else class="space-y-4" @submit.prevent="submit">
    <div>
      <label class="mb-1.5 block text-sm font-bold" for="pw">New password</label>
      <PortalPasswordInput id="pw" v-model="password" autocomplete="new-password" placeholder="Min 8 characters" />
    </div>
    <div>
      <label class="mb-1.5 block text-sm font-bold" for="pw2">Confirm password</label>
      <PortalPasswordInput id="pw2" v-model="confirm" autocomplete="new-password" placeholder="Re-enter password" />
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="btn-primary w-full !py-3" :disabled="loading">
      {{ loading ? 'Saving…' : 'Save & continue' }}
    </button>
  </form>
</template>
