<script setup lang="ts">
const route = useRoute()
const { data: comp } = await useFetch(`/api/public/competitions/${route.params.slug}`)

if (!comp.value) {
  throw createError({ statusCode: 404, statusMessage: 'Competition not found', fatal: true })
}

const deadlinePassed = computed(
  () => !!comp.value?.registrationDeadline && new Date(`${comp.value.registrationDeadline}T23:59:59`) < new Date(),
)
const canRegister = computed(() => comp.value?.registrationOpen && !deadlinePassed.value)

useSeoMeta({
  title: comp.value.name,
  description: `${comp.value.name} at ${comp.value.event?.title ?? 'BICTA'}: rules, prizes and registration.`,
})
</script>

<template>
  <div v-if="comp">
    <section class="relative overflow-hidden">
      <div class="hero-field" aria-hidden="true"><div class="float-blob float-blob-1" /></div>
      <div class="container-site pb-10 pt-8">
        <SiteBackButton :to="`/`" label="Back to home" />

        <div class="mt-8 max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-blue">{{ comp.type || 'Competition' }}</span>
            <span v-if="comp.teamBased" class="badge badge-purple">Teams up to {{ comp.maxTeamSize }}</span>
            <span v-if="canRegister" class="pill-open"><span class="dot-live" /> Registration open</span>
            <span v-else class="pill-closed">{{ deadlinePassed ? 'Deadline passed' : 'Registration closed' }}</span>
          </div>
          <h1 class="text-display mt-4">{{ comp.name }}</h1>
          <div class="mt-8 flex flex-wrap items-center gap-4">
            <NuxtLink v-if="canRegister" :to="`/competitions/${comp.slug}/register`" class="btn-primary">
              Register now <Icon name="lucide:arrow-right" />
            </NuxtLink>
            <p v-if="comp.registrationDeadline && canRegister" class="text-sm text-ink-soft">
              Deadline: <span class="font-bold text-ink">{{ formatDate(comp.registrationDeadline) }}</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section !pt-4">
      <div class="container-site grid gap-10 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <div v-if="comp.description">
            <h2 class="text-title">About</h2>
            <!-- eslint-disable-next-line vue/no-v-html — sanitized server-side on write -->
            <div class="prose-site mt-4" v-html="comp.description" />
          </div>
          <div v-if="comp.rules" class="mt-12">
            <h2 class="text-title">Rules</h2>
            <!-- eslint-disable-next-line vue/no-v-html — sanitized server-side on write -->
            <div class="prose-site mt-4" v-html="comp.rules" />
          </div>
        </div>

        <aside class="lg:col-span-1">
          <div v-if="comp.prizes.length" class="card p-6">
            <h3 class="font-extrabold tracking-tight">Prizes</h3>
            <ul class="mt-4 space-y-3">
              <li v-for="(p, i) in comp.prizes" :key="i" class="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <span class="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                  <Icon :name="i === 0 ? 'lucide:trophy' : 'lucide:medal'" :class="i === 0 ? 'text-amber-500' : 'text-ink-faint'" />
                  {{ p.position }}
                </span>
                <span class="font-extrabold text-brand-600">{{ p.amount }}</span>
              </li>
            </ul>
          </div>
          <div v-if="canRegister" class="card mt-5 bg-brand-600 p-6 text-white">
            <h3 class="text-lg font-extrabold">Ready to compete?</h3>
            <p class="mt-1 text-sm text-white/80">Registration takes about two minutes.</p>
            <NuxtLink :to="`/competitions/${comp.slug}/register`" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-600 transition-transform hover:-translate-y-0.5 active:scale-95">
              Register now <Icon name="lucide:arrow-right" />
            </NuxtLink>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>
