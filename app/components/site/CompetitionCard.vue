<script setup lang="ts">
const props = defineProps<{
  competition: {
    name: string
    slug: string
    type: string
    coverImage?: string | null
    registrationOpen: boolean
    prizes: { position: string; amount: string }[]
  }
  index?: number
}>()

const topPrize = computed(() => props.competition.prizes[0])

// Rotating "highlight" badge + icon tile per card position.
const meta = computed(() => {
  const variants = [
    { label: 'Most Popular', badge: 'badge-orange', tile: 'tile-blue', icon: 'lucide:code-xml' },
    { label: 'Beginner Friendly', badge: 'badge-purple', tile: 'tile-purple', icon: 'lucide:braces' },
    { label: 'Highest Prize', badge: 'badge-blue', tile: 'tile-green', icon: 'lucide:brain-circuit' },
  ]
  return variants[(props.index ?? 0) % variants.length]
})
</script>

<template>
  <NuxtLink :to="`/competitions/${competition.slug}`" class="card card-hover group flex flex-col p-6">
    <div class="flex items-start justify-between">
      <span class="tile h-11 w-11 text-xl" :class="meta.tile">
        <Icon :name="meta.icon" />
      </span>
      <span v-if="competition.registrationOpen" class="pill-open"><span class="dot-live" /> Registration open</span>
      <span v-else class="pill-closed">Closed</span>
    </div>

    <div class="mt-4 flex items-center gap-2">
      <span class="badge" :class="meta.badge">{{ meta.label }}</span>
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-faint">{{ competition.type }}</span>
    </div>

    <h3 class="mt-2 text-xl font-extrabold tracking-tight">{{ competition.name }}</h3>

    <div v-if="topPrize" class="mt-4">
      <p class="text-xs font-semibold text-ink-faint">Total Prize Pool</p>
      <p class="mt-0.5 text-2xl font-extrabold tracking-tight text-brand-600">{{ topPrize.amount }}</p>
    </div>

    <span class="mt-auto flex items-center gap-1.5 pt-5 text-sm font-bold text-brand-600">
      View details
      <Icon name="lucide:arrow-right" class="transition-transform duration-150 ease-out-quart group-hover:translate-x-1" />
    </span>
  </NuxtLink>
</template>
