<script setup lang="ts">
// Deliberately mirrors SitePersonCard (judges/speakers) so the two people
// grids read as one system. The differences are real ones: designation and
// organisation are separate lines rather than a single joined caption,
// because an advisor's institution is the point of the panel.
const props = defineProps<{
  advisor: {
    id: number
    name: string
    designation: string
    organization: string
    photoUrl?: string | null
    linkedinUrl?: string | null
  }
}>()

// Honorifics and the common "Md." prefix are dropped first, or "Dr. Rahim
// Uddin" initialises to DU rather than RU -- wrong on most of a panel where
// nearly every name carries a title. Dropping them all would leave nothing for
// a name that is only a title, so the raw parts stand in for that.
const HONORIFICS = /^(dr|prof|professor|mr|mrs|ms|miss|md|mohammad|muhammad|engr|eng|adv|hon|sir)\.?$/i

// First + last initial reads as a considered placeholder rather than the
// single stray letter a missing photo used to leave behind. One letter for a
// mononym; middle names are skipped.
const initials = computed(() => {
  const parts = props.advisor.name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const named = parts.filter((p) => !HONORIFICS.test(p))
  const use = named.length ? named : parts
  const first = use[0]![0] ?? ''
  const last = use.length > 1 ? (use.at(-1)![0] ?? '') : ''
  return (first + last).toUpperCase()
})
</script>

<template>
  <div class="card card-hover relative flex h-full flex-col overflow-hidden text-center">
    <!-- Tinted band: gives the portrait a top edge to sit against, which is
         what the flat centred stack was missing. -->
    <div class="h-20 w-full bg-gradient-brand-soft" aria-hidden="true" />

    <!-- Pinned, not stacked under the text. As a trailing block it only
         existed on some cards, so heights disagreed across a row. -->
    <a
      v-if="advisor.linkedinUrl"
      :href="advisor.linkedinUrl"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`${advisor.name} on LinkedIn`"
      class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-brand-700 ring-1 ring-inset ring-brand-100 backdrop-blur transition-colors hover:bg-brand-600 hover:text-white"
    >
      <Icon name="lucide:linkedin" class="text-base" />
    </a>

    <div class="flex flex-1 flex-col items-center px-5 pb-6">
      <!-- Overlaps the band. The white ring separates the portrait from both
           band and card body without needing a hard border. -->
      <div class="-mt-11 h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-full bg-white shadow-soft ring-4 ring-white">
        <img
          v-if="advisor.photoUrl"
          :src="advisor.photoUrl"
          :alt="advisor.name"
          loading="lazy"
          class="h-full w-full object-cover"
        />
        <span
          v-else
          class="flex h-full w-full items-center justify-center bg-brand-50 text-xl font-extrabold tracking-tight text-brand-700"
        >
          {{ initials }}
        </span>
      </div>

      <h3 class="mt-4 text-base font-extrabold leading-snug tracking-tight text-ink">
        {{ advisor.name }}
      </h3>
      <p v-if="advisor.designation" class="mt-1 text-sm font-bold leading-snug text-brand-700">
        {{ advisor.designation }}
      </p>

      <!-- mt-auto puts the institution on one baseline across a row whose
           names and titles wrap to different heights. -->
      <p
        v-if="advisor.organization"
        class="mt-auto pt-3 text-[0.6875rem] font-bold uppercase leading-snug tracking-[0.09em] text-ink-faint"
      >
        {{ advisor.organization }}
      </p>
    </div>
  </div>
</template>
