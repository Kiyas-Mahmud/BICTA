<script setup lang="ts">
import type { HackathonEvent } from '~/composables/useEvents'

const route = useRoute()
const eventId = route.params.id as string
const { event } = useEventById(eventId)

if (!event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found', fatal: true })
}

const ev = event.value as HackathonEvent

const maxMembers = computed(() => ev.teamSizeMax - 1)

// Form state
const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  institution: '',
  teamName: '',
  notes: '',
  website: '', // honeypot
})

interface TeamMember {
  id: number
  name: string
  email: string
  phone: string
}

let memberIdCounter = 0
const teamMembers = ref<TeamMember[]>([])

function addMember() {
  if (teamMembers.value.length < maxMembers.value) {
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
    // Simulate submission — in production, this would hit a real API
    await new Promise((resolve) => setTimeout(resolve, 1200))
    submitted.value = true
  } catch (e: unknown) {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

const canRegister = computed(() => ev.status !== 'past' && new Date(ev.registrationDeadline) >= new Date())

useSeoMeta({ title: `Register: ${ev.title}`, robots: 'noindex' })
</script>

<template>
  <div class="relative min-h-screen">
    <section class="container-site section relative z-10">
    <div class="mx-auto max-w-5xl">
      <SiteBackButton :to="`/events/${ev.id}`" label="Back to event" />

      <!-- Success state -->
      <template v-if="submitted">
        <div class="mx-auto max-w-xl card mt-8 p-10 text-center sm:p-12 !bg-white/70 backdrop-blur-xl !border-white/40 shadow-xl">
          <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white">
            <Icon name="lucide:check" class="text-3xl" />
          </span>
          <h1 class="mt-6 text-3xl font-extrabold tracking-tight">Registration received</h1>
          <p class="mx-auto mt-4 max-w-sm text-ink-soft">
            You're in for <span class="font-bold text-ink">{{ ev.title }}</span>. We'll confirm your spot by email.
          </p>
          <NuxtLink :to="`/events/${ev.id}`" class="btn-primary mt-8">Back to event</NuxtLink>
        </div>
      </template>

      <!-- Registration closed -->
      <template v-else-if="!canRegister">
        <div class="mx-auto max-w-xl card mt-8 p-10 text-center sm:p-12 !bg-white/70 backdrop-blur-xl !border-white/40 shadow-xl">
          <Icon name="lucide:clock" class="mx-auto text-4xl text-ink-faint" />
          <h1 class="mt-6 text-2xl font-extrabold tracking-tight">Registration Closed</h1>
          <p class="mx-auto mt-3 max-w-sm text-ink-soft">
            This event is no longer accepting registrations. Check out other <NuxtLink to="/events" class="font-bold text-brand-600 hover:underline">upcoming events</NuxtLink>.
          </p>
        </div>
      </template>

      <!-- Registration form -->
      <template v-else>
        <div class="mt-8 flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          
          <!-- Left Column -->
          <div class="lg:w-1/3 lg:sticky lg:top-24 space-y-8">
            <!-- Countdown -->
            <div>
              <p class="mb-4 text-sm font-bold tracking-wide text-ink uppercase">Time till deadline</p>
              <UiAnimatedNumberCountdown :end-date="ev.registrationDeadline" />
            </div>

            <!-- Title & Info -->
            <div>
              <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">{{ ev.title }}</h1>
              <p class="mt-4 text-sm font-medium leading-6 text-ink">
                Deadline: <span class="font-extrabold">{{ formatDate(ev.registrationDeadline) }}</span><br/>
                Team size: <span class="font-extrabold">{{ ev.teamSizeMin }}–{{ ev.teamSizeMax }} members</span>
              </p>
            </div>

            <!-- Rules -->
            <div class="pt-6 border-t border-line/50 hidden lg:block">
              <h2 class="text-base font-bold text-ink mb-4">Rules</h2>
              <ul class="space-y-3">
                <li v-for="(rule, i) in ev.rules" :key="i" class="flex gap-3 text-sm font-medium leading-relaxed text-ink">
                  <span class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"></span>
                  {{ rule }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Right Column -->
          <div class="lg:w-2/3 mt-8 lg:mt-0">
            <form @submit.prevent="submit" class="border border-white/40 rounded-xl p-6 sm:p-8 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
              
              <div class="col-span-full border-b border-line pb-2 mb-2">
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Team Leader</p>
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="r-fullName" class="font-medium">
                  Full name<span class="text-red-500">*</span>
                </UiLabel>
                <UiInput
                  type="text"
                  id="r-fullName"
                  v-model="form.fullName"
                  required
                  placeholder="e.g. Emma Crown"
                  class="mt-2"
                />
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="r-teamName" class="font-medium">
                  Team name
                </UiLabel>
                <UiInput
                  type="text"
                  id="r-teamName"
                  v-model="form.teamName"
                  placeholder="Give your team a name"
                  class="mt-2"
                />
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="r-email" class="font-medium">
                  Email<span class="text-red-500">*</span>
                </UiLabel>
                <UiInput
                  type="email"
                  id="r-email"
                  v-model="form.email"
                  required
                  placeholder="you@email.com"
                  class="mt-2"
                />
              </div>

              <div class="col-span-full sm:col-span-3">
                <UiLabel for="r-phone" class="font-medium">
                  Phone<span class="text-red-500">*</span>
                </UiLabel>
                <UiInput
                  type="tel"
                  id="r-phone"
                  v-model="form.phone"
                  required
                  placeholder="+880..."
                  class="mt-2"
                />
              </div>

              <div class="col-span-full">
                <UiLabel for="r-institution" class="font-medium">
                  Institution / Organization
                </UiLabel>
                <UiInput
                  type="text"
                  id="r-institution"
                  v-model="form.institution"
                  placeholder="University or company"
                  class="mt-2"
                />
              </div>

              <!-- Team Members Section -->
              <div class="col-span-full mt-4">
                <div class="border-b border-line pb-2 mb-4 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Team Members</p>
                    <p class="mt-0.5 text-xs text-ink-soft">
                      Besides you — max {{ maxMembers }} additional
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
                  v-if="teamMembers.length < maxMembers"
                  type="button"
                  class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-bold text-ink-faint transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600"
                  @click="addMember"
                >
                  <Icon name="lucide:plus" /> Add Team Member
                </button>
              </div>

              <!-- Notes -->
              <div class="col-span-full mt-2">
                <UiLabel for="r-notes" class="font-medium">Anything we should know?</UiLabel>
                <UiTextarea
                  id="r-notes"
                  v-model="form.notes"
                  rows="2"
                  class="mt-2"
                  placeholder="Dietary restrictions, accessibility needs, etc."
                />
              </div>
            </div>

            <!-- Honeypot -->
            <div class="absolute -left-[9999px] top-auto" aria-hidden="true">
              <label for="r-website">Website</label>
              <input id="r-website" v-model="form.website" tabindex="-1" autocomplete="off" />
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
                :to="`/events/${ev.id}`"
              >
                Go back
              </UiButton>
              <UiButton type="submit" class="whitespace-nowrap" :disabled="submitting">
                <Icon v-if="submitting" name="lucide:loader-2" class="mr-2 animate-spin" />
                {{ submitting ? 'Submitting…' : 'Submit Registration' }}
              </UiButton>
            </div>
          </form>

            <!-- Rules (Mobile only, below form) -->
            <div class="mt-12 pt-6 border-t border-line/50 lg:hidden">
              <h2 class="text-base font-bold text-ink mb-4">Rules</h2>
              <ul class="space-y-3">
                <li v-for="(rule, i) in ev.rules" :key="i" class="flex gap-3 text-sm font-medium leading-relaxed text-ink">
                  <span class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"></span>
                  {{ rule }}
                </li>
              </ul>
            </div>
            
            <p class="mt-6 text-center text-xs text-ink-faint">
              We collect only what's needed to run the competition. Your details are visible to organizers only.
            </p>
          </div>
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
