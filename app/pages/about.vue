<script setup lang="ts">
interface Advisor {
  id: number
  name: string
  designation: string
  organization: string
  photoUrl?: string | null
  linkedinUrl?: string | null
  category: 'university' | 'industry' | 'core'
}

const { data } = await useFetch<{ advisors: Advisor[]; settings: Record<string, string> }>('/api/public/about')

const settings = computed(() => data.value?.settings ?? {})
function s(key: string, fallback = '') { return settings.value[key] || fallback }

// Fixed tiers, fixed order. A panel renders only when it has members, so a
// site that has filled in one tier does not show two empty headings.
const ADVISOR_CATEGORIES = [
  { key: 'university', heading: 'University Advisors', icon: 'lucide:graduation-cap', tile: 'tile-blue' },
  { key: 'industry', heading: 'Industry Advisors', icon: 'lucide:building-2', tile: 'tile-purple' },
  { key: 'core', heading: 'Core Team', icon: 'lucide:users-round', tile: 'tile-green' },
] as const

const panels = computed(() =>
  ADVISOR_CATEGORIES.map((c) => ({
    ...c,
    people: (data.value?.advisors ?? []).filter((a) => a.category === c.key),
  })).filter((p) => p.people.length > 0),
)

const hasAdvisors = computed(() => panels.value.length > 0)

useSeoMeta({
  title: 'About us',
  description: () => s('about_intro', 'The people and institutions behind BICTA.').slice(0, 160),
})
</script>

<template>
  <section class="container-site section pt-header-safe pb-24">
    <SiteBackButton to="/" label="Back to home" />

    <div class="mx-auto mt-6 max-w-3xl text-center">
      <span class="eyebrow">{{ s('about_eyebrow', 'About us') }}</span>
      <h1 class="text-title mt-4">{{ s('about_heading', 'About BICTA') }}</h1>
      <p v-if="s('about_intro')" class="mt-4 text-lg leading-relaxed text-ink-soft">{{ s('about_intro') }}</p>
    </div>

    <!-- Advisory panel, one section per tier -->
    <div v-if="hasAdvisors" class="mt-16 space-y-16">
      <SiteSectionReveal v-for="panel in panels" :key="panel.key">
        <section>
          <div class="flex items-center gap-3">
            <span class="tile h-11 w-11 shrink-0 text-xl" :class="panel.tile">
              <Icon :name="panel.icon" />
            </span>
            <h2 class="text-title">{{ panel.heading }}</h2>
          </div>
          <div class="mt-8 grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
            <SiteAdvisorCard v-for="a in panel.people" :key="a.id" :advisor="a" />
          </div>
        </section>
      </SiteSectionReveal>
    </div>

    <!-- Nothing configured yet: say so plainly rather than shipping a page
         that looks broken. Only reachable before an admin fills the panel in. -->
    <div v-else-if="!s('about_intro')" class="mx-auto mt-16 max-w-md text-center">
      <span class="tile tile-blue mx-auto h-14 w-14 text-2xl"><Icon name="lucide:users-round" /></span>
      <p class="mt-4 font-bold text-ink">Advisor panel coming soon</p>
      <p class="mt-1 text-sm text-ink-soft">The people behind BICTA will be listed here.</p>
    </div>
  </section>
</template>
