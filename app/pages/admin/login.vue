<script setup lang="ts">
definePageMeta({ layout: false })

const { fetch: refreshSession, loggedIn, session } = useUserSession()

if (loggedIn.value && (session.value as any)?.user) {
  await navigateTo((session.value as any).user.role === 'volunteer' ? '/staff/scan' : '/admin')
}

const email = ref('')
const password = ref('')
const showPw = ref(false)
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refreshSession()
    // Volunteers only get the scanner; admins get the panel.
    await navigateTo(res.role === 'volunteer' ? '/staff/scan' : '/admin')
  } catch (e: any) {
    error.value =
      e?.statusCode === 429
        ? 'Too many attempts. Try again in 15 minutes.'
        : 'Invalid credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
    <div class="rise w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
      <h1 class="text-xl font-extrabold tracking-tight">
        BICTA <span class="text-xs font-semibold text-ink-faint">ADMIN</span>
      </h1>
      <p class="mt-1 text-sm text-ink-soft">Sign in to manage the site.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" v-model="email" type="email" required autocomplete="username" class="input" />
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              required
              autocomplete="current-password"
              class="input !pr-11"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-neutral-100 hover:text-ink"
              :aria-label="showPw ? 'Hide password' : 'Show password'"
              tabindex="-1"
              @click="showPw = !showPw"
            >
              <Icon :name="showPw ? 'lucide:eye-off' : 'lucide:eye'" />
            </button>
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
