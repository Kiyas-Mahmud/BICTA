<script setup lang="ts">
// Single sign-in door for admins, volunteers and participants. The server
// resolves which account table matched (server/api/auth/login.post.ts) and
// tells the client where home is; this page never guesses the role itself.
definePageMeta({ layout: false })

const { session, fetch: refreshSession } = useUserSession()

const staffUser = computed(() => (session.value as any)?.user)
const participant = computed(() => (session.value as any)?.participant)
if (staffUser.value) {
  await navigateTo(staffUser.value.role === 'volunteer' ? '/staff/scan' : '/admin')
} else if (participant.value) {
  await navigateTo('/portal')
}

const email = ref('')
const password = ref('')
const showPw = ref(false)
const capsOn = ref(false)
const error = ref('')
const loading = ref(false)

function onKey(e: KeyboardEvent) {
  capsOn.value = e.getModifierState?.('CapsLock') ?? false
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refreshSession()
    if (res.kind === 'participant') {
      await navigateTo('/portal')
    } else {
      await navigateTo(res.role === 'volunteer' ? '/staff/scan' : '/admin')
    }
  } catch (e: any) {
    error.value =
      e?.statusCode === 429
        ? 'Too many attempts. Try again in 15 minutes.'
        : 'Wrong email or password.'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: 'Sign in', robots: 'noindex' })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
    <div class="rise w-full max-w-sm">
      <div class="mb-7 flex flex-col items-center text-center">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft">
          <Icon name="lucide:command" class="text-lg" />
        </span>
        <h1 class="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-ink">Sign in to BICTA</h1>
        <p class="mt-1.5 text-sm text-ink-soft">Organizers, volunteers and participants all use this form.</p>
      </div>

      <div class="surface p-6 sm:p-7">
        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="label" for="email">Email</label>
            <div class="relative">
              <Icon name="lucide:mail" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input id="email" v-model="email" type="email" required autocomplete="username" class="input !pl-9" placeholder="you@email.com" />
            </div>
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="label !mb-0" for="password">Password</label>
              <NuxtLink to="/portal/forgot" class="text-xs font-semibold text-brand-700 hover:text-brand-800">Forgot password?</NuxtLink>
            </div>
            <div class="relative">
              <Icon name="lucide:lock" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="password"
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="input !pl-9 !pr-11"
                @keyup="onKey"
                @keydown="onKey"
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
            <p v-if="capsOn" class="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <Icon name="lucide:triangle-alert" /> Caps Lock is on
            </p>
          </div>

          <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1">
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          </Transition>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <Icon v-if="loading" name="lucide:loader-2" class="animate-spin" />
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>

      <p class="mt-5 text-center text-sm text-ink-soft">
        Not registered yet? <NuxtLink to="/events" class="font-semibold text-brand-700 hover:text-brand-800">Find a competition</NuxtLink>
      </p>
    </div>
  </div>
</template>
