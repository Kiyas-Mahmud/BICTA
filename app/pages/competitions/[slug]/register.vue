<script setup lang="ts">
const route = useRoute()
const { data: comp } = await useFetch(`/api/public/competitions/${route.params.slug}`)

if (!comp.value) {
  throw createError({ statusCode: 404, statusMessage: 'Competition not found', fatal: true })
}

const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  institution: '',
  teamName: '',
  notes: '',
  website: '', // honeypot — humans never see or fill this
})

const teamMembers = ref<{ name: string; email: string }[]>([])
const formToken = ref('')
onMounted(() => {
  formToken.value = String(Date.now())
})

const maxExtraMembers = computed(() => (comp.value ? comp.value.maxTeamSize - 1 : 0))
function addMember() {
  if (teamMembers.value.length < maxExtraMembers.value) teamMembers.value.push({ name: '', email: '' })
}
function removeMember(i: number) {
  teamMembers.value.splice(i, 1)
}

const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await $fetch('/api/registrations', {
      method: 'POST',
      body: {
        competitionId: comp.value!.id,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        institution: form.institution,
        teamName: comp.value!.teamBased ? form.teamName || null : null,
        teamMembers: comp.value!.teamBased ? teamMembers.value.filter((m) => m.name && m.email) : null,
        notes: form.notes || null,
        website: form.website,
        formToken: formToken.value,
      },
    })
    submitted.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: `Register: ${comp.value.name}`, robots: 'noindex' })
</script>

<template>
  <section v-if="comp" class="container-site section">
    <div class="mx-auto max-w-xl">
      <SiteBackButton :to="`/competitions/${comp.slug}`" label="Back to competition" />

      <template v-if="submitted">
        <div class="card mt-8 p-10 text-center sm:p-12">
          <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white">
            <Icon name="lucide:check" class="text-3xl" />
          </span>
          <h1 class="mt-6 text-3xl font-extrabold tracking-tight">Registration received</h1>
          <p class="mx-auto mt-4 max-w-sm text-ink-soft">
            You're in for <span class="font-bold text-ink">{{ comp.name }}</span>. We'll confirm your spot by email.
          </p>
          <NuxtLink to="/" class="btn-primary mt-8">Back to home</NuxtLink>
        </div>
      </template>

      <template v-else>
        <h1 class="text-title mt-6">Register for {{ comp.name }}</h1>
        <p v-if="comp.registrationDeadline" class="mt-2 text-sm text-ink-soft">
          Deadline: <span class="font-bold text-ink">{{ formatDate(comp.registrationDeadline) }}</span>
        </p>

        <form class="card mt-8 space-y-5 p-6 sm:p-8" @submit.prevent="submit">
          <div>
            <label class="mb-2 block text-sm font-bold" for="fullName">Full name *</label>
            <input id="fullName" v-model="form.fullName" class="field" required minlength="2" maxlength="150" />
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-bold" for="email">Email *</label>
              <input id="email" v-model="form.email" type="email" class="field" required maxlength="254" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-bold" for="phone">Phone *</label>
              <input id="phone" v-model="form.phone" type="tel" class="field" required maxlength="30" placeholder="+880…" />
            </div>
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold" for="institution">Institution / organization</label>
            <input id="institution" v-model="form.institution" class="field" maxlength="200" />
          </div>

          <template v-if="comp.teamBased">
            <div>
              <label class="mb-2 block text-sm font-bold" for="teamName">Team name</label>
              <input id="teamName" v-model="form.teamName" class="field" maxlength="150" />
            </div>
            <div>
              <div class="flex items-center justify-between">
                <p class="text-sm font-bold">
                  Team members <span class="font-medium text-ink-faint">(besides you, max {{ maxExtraMembers }})</span>
                </p>
                <button
                  v-if="teamMembers.length < maxExtraMembers"
                  type="button"
                  class="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700"
                  @click="addMember"
                >
                  <Icon name="lucide:plus" /> Add member
                </button>
              </div>
              <div v-for="(m, i) in teamMembers" :key="i" class="mt-3 flex gap-2">
                <input v-model="m.name" class="field" placeholder="Name" maxlength="150" />
                <input v-model="m.email" type="email" class="field" placeholder="Email" maxlength="254" />
                <button type="button" class="btn-secondary !px-3" aria-label="Remove member" @click="removeMember(i)">
                  <Icon name="lucide:x" />
                </button>
              </div>
            </div>
          </template>

          <div>
            <label class="mb-2 block text-sm font-bold" for="notes">Anything we should know?</label>
            <textarea id="notes" v-model="form.notes" class="field" rows="3" maxlength="1000" />
          </div>

          <!-- Honeypot — hidden from humans, bots fill it -->
          <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
            <label for="website">Website</label>
            <input id="website" v-model="form.website" tabindex="-1" autocomplete="off" />
          </div>

          <p v-if="error" class="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{{ error }}</p>

          <button type="submit" class="btn-primary w-full !py-4" :disabled="submitting">
            {{ submitting ? 'Submitting…' : 'Submit registration' }}
          </button>
          <p class="text-center text-xs text-ink-faint">
            We collect only what's needed to run the competition. Your details are visible to organizers only.
          </p>
        </form>
      </template>
    </div>
  </section>
</template>
