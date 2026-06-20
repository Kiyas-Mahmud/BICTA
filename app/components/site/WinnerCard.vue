<script setup lang="ts">
defineProps<{
  winner: {
    id: number
    name: string
    competitionName: string
    position: string
    year?: number | null
    photoUrl?: string | null
    projectTitle?: string | null
  }
}>()
</script>

<template>
  <div class="card card-hover group flex items-center gap-4 p-4">
    <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl img-zoom" :class="{ 'bg-mist-2': !winner.photoUrl }">
      <img v-if="winner.photoUrl" :src="winner.photoUrl" :alt="winner.name" loading="lazy" class="h-full w-full object-cover" />
      <span v-else class="flex h-full w-full items-center justify-center text-brand-600">
        <Icon name="lucide:trophy" class="text-2xl" />
      </span>
    </div>
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-xs font-bold text-amber-600">
        <Icon name="lucide:medal" />
        <span>{{ winner.position || 'Winner' }}<span v-if="winner.year" class="text-ink-faint"> · {{ winner.year }}</span></span>
      </div>
      <h3 class="mt-1 truncate font-extrabold tracking-tight">{{ winner.name }}</h3>
      <p v-if="winner.projectTitle" class="truncate text-sm text-ink-soft">{{ winner.competitionName }}: {{ winner.projectTitle }}</p>
      <p v-else-if="winner.competitionName" class="truncate text-sm text-ink-soft">{{ winner.competitionName }}</p>
    </div>
  </div>
</template>
