<script setup lang="ts">
// Shared contact form (home section + /contact page), wired to the hardened
// POST /api/contact endpoint. One implementation, one behavior.
const form = reactive({ name: '', email: '', subject: '', message: '', website: '' })
const formToken = ref('')
onMounted(() => { formToken.value = String(Date.now()) })

const submitting = ref(false)
const done = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { ...form, formToken: formToken.value },
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
  <div v-if="done" class="flex h-full flex-col items-center justify-center py-10 text-center">
    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
      <Icon name="lucide:check" class="text-2xl" />
    </span>
    <p class="mt-4 text-lg font-extrabold tracking-tight">Message sent</p>
    <p class="mt-1 max-w-xs text-sm text-ink-soft">Thanks for reaching out. We usually reply within one business day.</p>
  </div>

  <form v-else class="w-full space-y-4" @submit.prevent="submit">
    <div>
      <UiLabel for="cf-name">Name *</UiLabel>
      <UiInput id="cf-name" v-model="form.name" type="text" required minlength="2" maxlength="150" placeholder="Your name" />
    </div>
    <div>
      <UiLabel for="cf-email">Email *</UiLabel>
      <UiInput id="cf-email" v-model="form.email" type="email" required maxlength="254" placeholder="you@email.com" />
    </div>
    <div>
      <UiLabel for="cf-subject">Subject</UiLabel>
      <UiInput id="cf-subject" v-model="form.subject" type="text" maxlength="200" placeholder="What is this about?" />
    </div>
    <div>
      <UiLabel for="cf-message">Message *</UiLabel>
      <UiTextarea id="cf-message" v-model="form.message" required rows="4" maxlength="4000" placeholder="How can we help?" />
    </div>

    <!-- honeypot -->
    <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
      <label for="cf-website">Website</label>
      <input id="cf-website" v-model="form.website" tabindex="-1" autocomplete="off" />
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <UiButton type="submit" class="mt-2 w-full" :disabled="submitting">
      <Icon v-if="submitting" name="lucide:loader-2" class="animate-spin" />
      {{ submitting ? 'Sending…' : 'Send message' }}
    </UiButton>
  </form>
</template>
