<script setup lang="ts">
// Deliberately mirrors SitePersonCard (judges/speakers) so the two people
// grids read as one system. The differences are real ones: designation and
// organisation are separate lines rather than a single joined caption,
// because an advisor's institution is the point of the panel.
defineProps<{
  advisor: {
    id: number
    name: string
    designation: string
    organization: string
    photoUrl?: string | null
    linkedinUrl?: string | null
  }
}>()
</script>

<template>
  <div class="card card-hover flex flex-col items-center p-6 text-center">
    <div class="h-24 w-24 overflow-hidden rounded-full ring-4 ring-mist-1" :class="{ 'bg-mist-2': !advisor.photoUrl }">
      <img v-if="advisor.photoUrl" :src="advisor.photoUrl" :alt="advisor.name" loading="lazy" class="h-full w-full object-cover" />
      <span v-else class="flex h-full w-full items-center justify-center text-3xl font-extrabold text-ink-faint">
        {{ advisor.name.charAt(0) }}
      </span>
    </div>

    <h3 class="mt-4 text-lg font-extrabold tracking-tight">{{ advisor.name }}</h3>
    <p v-if="advisor.designation" class="mt-1 text-sm font-bold text-brand-700">{{ advisor.designation }}</p>
    <p v-if="advisor.organization" class="mt-0.5 text-sm text-ink-soft">{{ advisor.organization }}</p>

    <a
      v-if="advisor.linkedinUrl"
      :href="advisor.linkedinUrl"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`${advisor.name} on LinkedIn`"
      class="mt-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors hover:bg-brand-600 hover:text-white"
    >
      <Icon name="lucide:linkedin" />
    </a>
  </div>
</template>
