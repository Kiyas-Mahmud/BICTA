<script setup lang="ts">
defineProps<{
  person: {
    id: number
    name: string
    title: string
    organization: string
    photoUrl?: string | null
    bio: string
    socialUrl?: string | null
  }
}>()
</script>

<template>
  <div class="card card-hover flex flex-col items-center p-6 text-center">
    <div class="h-20 w-20 overflow-hidden rounded-full ring-4 ring-mist-1" :class="{ 'bg-mist-2': !person.photoUrl }">
      <img v-if="person.photoUrl" :src="person.photoUrl" :alt="person.name" loading="lazy" class="h-full w-full object-cover" />
      <span v-else class="flex h-full w-full items-center justify-center text-2xl font-extrabold text-ink-faint">
        {{ person.name.charAt(0) }}
      </span>
    </div>
    <h3 class="mt-4 font-extrabold tracking-tight">{{ person.name }}</h3>
    <p v-if="person.title || person.organization" class="mt-0.5 text-sm text-ink-soft">
      {{ person.title }}<span v-if="person.title && person.organization"> · </span>{{ person.organization }}
    </p>
    <a
      v-if="person.socialUrl"
      :href="person.socialUrl"
      target="_blank"
      rel="noopener"
      aria-label="Profile"
      class="mt-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors hover:bg-brand-600 hover:text-white"
    >
      <Icon name="lucide:linkedin" />
    </a>
  </div>
</template>
