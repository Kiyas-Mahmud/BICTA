<script setup lang="ts">
// Accepting a staff invitation. No layout chrome and no auth middleware: the
// invitee has no session yet, and the emailed token is the only credential.
definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))

const password = ref('')
const confirm = ref('')
const showPw = ref(false)
const saving = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Choose a password of at least 8 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'The two passwords do not match.'
    return
  }
  saving.value = true
  try {
    const res = await $fetch<{ role: string }>('/api/staff/set-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    // The endpoint signs them in, so go straight to whichever console they
    // belong to. Hard navigation avoids the session-ref race a soft redirect
    // can hit right after the cookie is set.
    window.location.href = res.role === 'volunteer' ? '/staff/scan' : '/admin'
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Could not set your password. Try again.'
    saving.value = false
  }
}

useSeoMeta({ title: 'Set your password', robots: 'noindex' })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
    <div class="rise w-full max-w-sm">
      <div class="mb-7 flex flex-col items-center text-center">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft">
          <Icon name="lucide:shield-check" class="text-lg" />
        </span>
        <h1 class="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-ink">Set your password</h1>
        <p class="mt-1.5 text-sm text-ink-soft">Activate your BICTA staff account.</p>
      </div>

      <div class="surface p-6 sm:p-7">
        <p v-if="!token" class="form-error" role="alert">
          This link is missing its token. Open the button in your invitation email instead.
        </p>

        <form v-else class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="label" for="sp-pass">New password</label>
            <div class="relative">
              <Icon name="lucide:lock" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="sp-pass"
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                required
                autocomplete="new-password"
                class="input !pl-9 !pr-11"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                class="icon-btn-sm absolute right-2 top-1/2 -translate-y-1/2"
                :aria-label="showPw ? 'Hide password' : 'Show password'"
                @click="showPw = !showPw"
              >
                <Icon :name="showPw ? 'lucide:eye-off' : 'lucide:eye'" />
              </button>
            </div>
          </div>

          <div>
            <label class="label" for="sp-confirm">Confirm password</label>
            <input
              id="sp-confirm"
              v-model="confirm"
              :type="showPw ? 'text' : 'password'"
              required
              autocomplete="new-password"
              class="input"
            />
          </div>

          <p v-if="error" class="form-error" role="alert">{{ error }}</p>

          <button type="submit" class="btn-primary w-full" :disabled="saving">
            <Icon v-if="saving" name="lucide:loader-2" class="animate-spin" />
            {{ saving ? 'Activating…' : 'Activate my account' }}
          </button>
        </form>
      </div>

      <p class="mt-5 text-center text-sm text-ink-soft">
        Already set up? <NuxtLink to="/login" class="font-semibold text-brand-700 hover:text-brand-800">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
