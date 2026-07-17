<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user } = useUserSession()

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

const initials = computed(() => {
  const n = (user.value as any)?.name || (user.value as any)?.email || 'A'
  return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('')
})
</script>

<template>
  <div>
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Account</h1>
        <p class="admin-sub">Your sign-in and security.</p>
      </div>
    </div>

    <div class="mt-6 grid max-w-3xl gap-6 lg:grid-cols-[280px_1fr]">
      <!-- profile card -->
      <div class="admin-panel h-fit text-center">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">{{ initials }}</span>
        <p class="mt-3 font-bold text-ink">{{ (user as any)?.name || 'Administrator' }}</p>
        <p class="truncate text-sm text-ink-faint">{{ user?.email }}</p>
        <span class="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold capitalize text-brand-700">
          <Icon name="lucide:shield-check" /> {{ (user as any)?.role || 'admin' }}
        </span>
      </div>

      <!-- password form -->
      <form class="admin-panel space-y-4" @submit.prevent="save">
        <div class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon name="lucide:key-round" /></span>
          <h2 class="text-sm font-bold text-ink">Change password</h2>
        </div>
        <div>
          <label class="label">Current password</label>
          <input v-model="currentPassword" type="password" class="input" required autocomplete="current-password" />
        </div>
        <div>
          <label class="label">New password <span class="font-normal text-ink-faint">(min 12 chars)</span></label>
          <input v-model="newPassword" type="password" class="input" required autocomplete="new-password" />
        </div>
        <div>
          <label class="label">Confirm new password</label>
          <input v-model="confirm" type="password" class="input" required autocomplete="new-password" />
        </div>

        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1">
          <p v-if="msg" class="inline-flex items-center gap-1 text-sm text-green-700"><Icon name="lucide:check-circle" /> {{ msg }}</p>
        </Transition>
        <p v-if="err" class="text-sm text-red-600">{{ err }}</p>

        <button type="submit" class="btn-primary" :disabled="saving">
          <Icon v-if="saving" name="lucide:loader-2" class="animate-spin" />
          {{ saving ? 'Updating…' : 'Update password' }}
        </button>
      </form>
    </div>
  </div>
</template>
