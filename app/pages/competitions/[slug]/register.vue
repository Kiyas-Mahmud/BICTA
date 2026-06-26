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

interface TeamMember {
  id: number
  name: string
  email: string
  phone: string
}

let memberIdCounter = 0
const teamMembers = ref<TeamMember[]>([])
const formToken = ref('')
onMounted(() => {
  formToken.value = String(Date.now())
})

const maxExtraMembers = computed(() => (comp.value ? comp.value.maxTeamSize - 1 : 4))

function addMember() {
  if (teamMembers.value.length < maxExtraMembers.value) {
    teamMembers.value.push({ id: ++memberIdCounter, name: '', email: '', phone: '' })
  }
}
function removeMember(id: number) {
  teamMembers.value = teamMembers.value.filter((m) => m.id !== id)
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
        teamMembers: comp.value!.teamBased
          ? teamMembers.value
              .filter((m) => m.name && m.email)
              .map((m) => ({ name: m.name, email: m.email, phone: m.phone || undefined }))
          : null,
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
  <div class="relative min-h-screen">
    <section v-if="comp" class="container-site section relative z-10">
    <div class="mx-auto max-w-xl">
      <SiteBackButton :to="`/competitions/${comp.slug}`" label="Back to competition" />

      <!-- Success -->
      <template v-if="submitted">
        <div class="card mt-8 p-10 text-center sm:p-12 !bg-white/70 backdrop-blur-xl !border-white/40 shadow-xl">
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

      <!-- Form -->
      <template v-else>
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-ink">
            Register for {{ comp.name }}
          </h3>
          <p v-if="comp.registrationDeadline" class="mt-1 text-sm leading-6 text-ink-soft">
            Deadline: <span class="font-bold">{{ formatDate(comp.registrationDeadline) }}</span>
          </p>

          <form @submit.prevent="submit" class="mt-8 border border-white/40 rounded-xl p-6 sm:p-8 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
              
              <div class="col-span-full border-b border-line pb-2 mb-2">
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Team Leader</p>
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="fullName" class="font-medium">
                  Full name<span class="text-red-500">*</span>
                </UiLabel>
                <UiInput
                  type="text"
                  id="fullName"
                  v-model="form.fullName"
                  required
                  placeholder="e.g. Emma Crown"
                  class="mt-2"
                />
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="email" class="font-medium">
                  Email<span class="text-red-500">*</span>
                </UiLabel>
                <UiInput
                  type="email"
                  id="email"
                  v-model="form.email"
                  required
                  placeholder="you@email.com"
                  class="mt-2"
                />
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="phone" class="font-medium">
                  Phone<span class="text-red-500">*</span>
                </UiLabel>
                <UiInput
                  type="tel"
                  id="phone"
                  v-model="form.phone"
                  required
                  placeholder="+880..."
                  class="mt-2"
                />
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="institution" class="font-medium">
                  Institution / Organization
                </UiLabel>
                <UiInput
                  type="text"
                  id="institution"
                  v-model="form.institution"
                  placeholder="University or company"
                  class="mt-2"
                />
              </div>

              <!-- Team section (only for team-based competitions) -->
              <template v-if="comp.teamBased">
                <div class="col-span-full mt-4">
                  <UiLabel for="teamName" class="font-medium">
                    Team name
                  </UiLabel>
                  <UiInput
                    type="text"
                    id="teamName"
                    v-model="form.teamName"
                    placeholder="Give your team a name"
                    class="mt-2"
                  />
                </div>

                <!-- Team Members -->
                <div class="col-span-full mt-4">
                  <div class="border-b border-line pb-2 mb-4 flex items-center justify-between">
                    <div>
                      <p class="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Team Members</p>
                      <p class="mt-0.5 text-xs text-ink-soft">
                        Besides you — max {{ maxExtraMembers }} additional
                        <span v-if="teamMembers.length > 0" class="font-bold text-ink-soft">({{ teamMembers.length }} added)</span>
                      </p>
                    </div>
                  </div>

                  <TransitionGroup name="member" tag="div" class="space-y-4">
                    <div
                      v-for="(m, i) in teamMembers"
                      :key="m.id"
                      class="rounded-xl border border-white/40 bg-white/50 backdrop-blur-md p-4 shadow-sm"
                    >
                      <div class="mb-3 flex items-center justify-between">
                        <span class="text-xs font-bold text-ink-soft">Member {{ i + 1 }}</span>
                        <button
                          type="button"
                          class="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label="Remove member"
                          @click="removeMember(m.id)"
                        >
                          <Icon name="lucide:x" class="text-sm" />
                        </button>
                      </div>
                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <div class="col-span-full">
                          <UiLabel class="font-medium">Full name<span class="text-red-500">*</span></UiLabel>
                          <UiInput v-model="m.name" class="mt-2 bg-white/80" placeholder="Member's full name" required />
                        </div>
                        <div class="col-span-full sm:col-span-3">
                          <UiLabel class="font-medium">Email<span class="text-red-500">*</span></UiLabel>
                          <UiInput v-model="m.email" type="email" class="mt-2 bg-white/80" placeholder="Email" required />
                        </div>
                        <div class="col-span-full sm:col-span-3">
                          <UiLabel class="font-medium">Phone</UiLabel>
                          <UiInput v-model="m.phone" type="tel" class="mt-2 bg-white/80" placeholder="Phone (optional)" />
                        </div>
                      </div>
                    </div>
                  </TransitionGroup>

                  <button
                    v-if="teamMembers.length < maxExtraMembers"
                    type="button"
                    class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-bold text-ink-faint transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600"
                    @click="addMember"
                  >
                    <Icon name="lucide:plus" /> Add Team Member
                  </button>
                </div>
              </template>

              <!-- Notes -->
              <div class="col-span-full mt-2">
                <UiLabel for="notes" class="font-medium">Anything we should know?</UiLabel>
                <UiTextarea
                  id="notes"
                  v-model="form.notes"
                  rows="2"
                  class="mt-2"
                  placeholder="Dietary restrictions, accessibility needs, etc."
                />
              </div>
            </div>

            <!-- Honeypot -->
            <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
              <label for="website">Website</label>
              <input id="website" v-model="form.website" tabindex="-1" autocomplete="off" />
            </div>

            <!-- Error -->
            <p v-if="error" class="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{{ error }}</p>

            <hr class="my-6 border-line" />
            
            <div class="flex items-center justify-end space-x-4">
              <UiButton
                type="button"
                variant="outline"
                class="whitespace-nowrap"
                as="NuxtLink"
                :href="`/competitions/${comp.slug}`"
              >
                Go back
              </UiButton>
              <UiButton type="submit" class="whitespace-nowrap" :disabled="submitting">
                {{ submitting ? 'Submitting…' : 'Submit Registration' }}
              </UiButton>
            </div>
            
            <p class="mt-6 text-center text-xs text-ink-faint">
              We collect only what's needed to run the competition. Your details are visible to organizers only.
            </p>
          </form>
        </div>
      </template>
    </div>
  </section>
  </div>
</template>

<style scoped>
.member-enter-active {
  transition: all 350ms cubic-bezier(0.22, 1, 0.36, 1);
}
.member-leave-active {
  transition: all 200ms ease;
}
.member-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}
.member-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}
</style>
