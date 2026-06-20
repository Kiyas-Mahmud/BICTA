<script setup lang="ts">
const email = ref('')
const website = ref('') // honeypot
const formToken = ref('')
onMounted(() => { formToken.value = String(Date.now()) })

const submitting = ref(false)
const done = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await $fetch('/api/newsletter', {
      method: 'POST',
      body: { email: email.value, website: website.value, formToken: formToken.value },
    })
    done.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-3xl bg-brand-600 px-6 py-8 sm:px-10">
    <div class="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
      <div class="flex items-center gap-4 text-white">
        <span class="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/15 sm:flex">
          <Icon name="lucide:mail" class="text-2xl" />
        </span>
        <div>
          <slot />
        </div>
      </div>

      <form v-if="!done" class="flex w-full max-w-md flex-col gap-3 sm:flex-row" @submit.prevent="submit">
        <input
          v-model="email"
          type="email"
          required
          maxlength="254"
          placeholder="Enter your email"
          aria-label="Email address"
          class="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-white/60 sm:flex-1"
        />
        <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
          <label for="nl-website">Website</label>
          <input id="nl-website" v-model="website" tabindex="-1" autocomplete="off" />
        </div>
        <button type="submit" class="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-600 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60" :disabled="submitting">
          {{ submitting ? 'Subscribing…' : 'Subscribe' }}
        </button>
      </form>
      <p v-else class="flex items-center gap-2 font-bold text-white">
        <Icon name="lucide:check-circle-2" /> You're subscribed.
      </p>
    </div>
    <p v-if="error" class="mt-3 text-center text-sm font-semibold text-white/90 lg:text-right">{{ error }}</p>
  </div>
</template>
