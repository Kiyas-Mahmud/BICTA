<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const currentPassword = ref('')
const newPassword = ref('')
const confirm = ref('')
const msg = ref('')
const err = ref('')
const saving = ref(false)

async function save() {
  msg.value = ''
  err.value = ''
  if (newPassword.value !== confirm.value) {
    err.value = 'New passwords do not match.'
    return
  }
  if (newPassword.value.length < 12) {
    err.value = 'New password must be at least 12 characters.'
    return
  }
  saving.value = true
  try {
    await $fetch('/api/admin/account/password', {
      method: 'PUT',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    })
    msg.value = 'Password updated.'
    currentPassword.value = newPassword.value = confirm.value = ''
  } catch (e: any) {
    err.value = e?.data?.statusMessage ?? 'Update failed.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Account</h1>

    <form class="mt-6 max-w-md space-y-4 rounded-xl border border-line bg-white p-6" @submit.prevent="save">
      <div>
        <label class="label">Current password</label>
        <input v-model="currentPassword" type="password" class="input" required autocomplete="current-password" />
      </div>
      <div>
        <label class="label">New password (min 12 chars)</label>
        <input v-model="newPassword" type="password" class="input" required autocomplete="new-password" />
      </div>
      <div>
        <label class="label">Confirm new password</label>
        <input v-model="confirm" type="password" class="input" required autocomplete="new-password" />
      </div>

      <p v-if="msg" class="text-sm text-green-600">{{ msg }}</p>
      <p v-if="err" class="text-sm text-red-600">{{ err }}</p>

      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Updating…' : 'Update password' }}
      </button>
    </form>
  </div>
</template>
