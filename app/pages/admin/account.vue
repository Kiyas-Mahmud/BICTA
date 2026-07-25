<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user } = useUserSession()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirm = ref('')
const msg = ref('')
const err = ref('')
const saving = ref(false)
const show = reactive({ current: false, next: false })

// Live requirement checklist — the same rules the submit handler enforces.
const checks = computed(() => [
  { label: 'At least 12 characters', ok: newPassword.value.length >= 12 },
  { label: 'Mixes letters and numbers', ok: /[a-z]/i.test(newPassword.value) && /\d/.test(newPassword.value) },
  { label: 'Both new fields match', ok: Boolean(newPassword.value) && newPassword.value === confirm.value },
])
const strength = computed(() => checks.value.filter((c) => c.ok).length)
const strengthLabel = ['Too weak', 'Weak', 'Almost there', 'Strong'][strength.value] ?? ''

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
    toast.success('Password updated', 'Use the new one next time you sign in.')
    currentPassword.value = newPassword.value = confirm.value = ''
  } catch (e: any) {
    err.value = e?.data?.statusMessage ?? 'Update failed.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Account" subtitle="Your sign-in details and security." icon="lucide:user-cog" />

    <div class="grid max-w-4xl gap-5 lg:grid-cols-[18rem_1fr] lg:items-start">
      <!-- profile card -->
      <section class="surface fade-up stagger-1 overflow-hidden">
        <div class="bg-gradient-brand px-5 pb-10 pt-5">
          <p class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/70">Signed in as</p>
        </div>
        <div class="-mt-8 px-5 pb-5 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1 shadow-soft">
            <AdminAvatar :name="(user as any)?.name || user?.email" size="lg" class="!rounded-xl" />
          </div>
          <p class="mt-3 font-bold text-ink">{{ (user as any)?.name || 'Administrator' }}</p>
          <p class="truncate text-sm text-ink-faint">{{ user?.email }}</p>
          <span class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold capitalize text-brand-800 ring-1 ring-inset ring-brand-100">
            <Icon name="lucide:shield-check" /> {{ (user as any)?.role || 'admin' }}
          </span>
        </div>
        <div class="border-t border-line px-5 py-4">
          <p class="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Icon name="lucide:info" class="mt-0.5 shrink-0 text-brand-700" />
            Sessions are sealed cookies. Changing your password does not sign other people out — remove their account instead.
          </p>
        </div>
      </section>

      <!-- password form -->
      <AdminPanel title="Change password" subtitle="Use something long and unique to this site." icon="lucide:key-round" class="fade-up stagger-2">
        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="label" for="pw-current">Current password</label>
            <div class="relative">
              <input
                id="pw-current"
                v-model="currentPassword"
                :type="show.current ? 'text' : 'password'"
                class="input !pr-11"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="icon-btn-sm absolute right-2 top-1/2 -translate-y-1/2"
                :aria-label="show.current ? 'Hide current password' : 'Show current password'"
                @click="show.current = !show.current"
              >
                <Icon :name="show.current ? 'lucide:eye-off' : 'lucide:eye'" />
              </button>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="pw-new">New password</label>
              <div class="relative">
                <input
                  id="pw-new"
                  v-model="newPassword"
                  :type="show.next ? 'text' : 'password'"
                  class="input !pr-11"
                  required
                  autocomplete="new-password"
                  minlength="12"
                />
                <button
                  type="button"
                  class="icon-btn-sm absolute right-2 top-1/2 -translate-y-1/2"
                  :aria-label="show.next ? 'Hide new password' : 'Show new password'"
                  @click="show.next = !show.next"
                >
                  <Icon :name="show.next ? 'lucide:eye-off' : 'lucide:eye'" />
                </button>
              </div>
            </div>
            <div>
              <label class="label" for="pw-confirm">Confirm new password</label>
              <input
                id="pw-confirm"
                v-model="confirm"
                :type="show.next ? 'text' : 'password'"
                class="input"
                required
                autocomplete="new-password"
              />
            </div>
          </div>

          <!-- strength + requirements -->
          <div v-if="newPassword" class="surface-quiet p-3.5">
            <div class="flex items-center gap-3">
              <div class="flex flex-1 gap-1.5" role="presentation">
                <span
                  v-for="i in 3"
                  :key="i"
                  class="h-1.5 flex-1 rounded-full transition-colors duration-300"
                  :class="i <= strength ? (strength === 3 ? 'bg-green-500' : 'bg-amber-400') : 'bg-line'"
                />
              </div>
              <span class="text-xs font-bold" :class="strength === 3 ? 'text-green-700' : 'text-amber-700'">{{ strengthLabel }}</span>
            </div>
            <ul class="mt-3 space-y-1.5">
              <li v-for="c in checks" :key="c.label" class="flex items-center gap-2 text-xs" :class="c.ok ? 'text-green-700' : 'text-ink-faint'">
                <Icon :name="c.ok ? 'lucide:circle-check-big' : 'lucide:circle'" class="text-sm" />
                {{ c.label }}
              </li>
            </ul>
          </div>

          <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1">
            <p v-if="msg" class="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <Icon name="lucide:circle-check-big" /> {{ msg }}
            </p>
          </Transition>
          <p v-if="err" class="form-error" role="alert">{{ err }}</p>

          <button type="submit" class="btn-primary !py-2.5" :disabled="saving">
            <Icon v-if="saving" name="lucide:loader-2" class="animate-spin" />
            {{ saving ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </AdminPanel>
    </div>
  </div>
</template>
