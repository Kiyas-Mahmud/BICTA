<script setup lang="ts">
export interface TimelineItem {
  id: string
  title: string
  description: string
  timestamp: string | Date
  status: 'completed' | 'active' | 'pending'
}

const props = defineProps<{
  items: TimelineItem[]
}>()

function getIcon(idx: number) {
  const icons = ['lucide:flag', 'lucide:calendar', 'lucide:upload', 'lucide:medal']
  return icons[idx % icons.length]
}

function format(date: string | Date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d)
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <div v-for="(item, idx) in items.slice(0, 4)" :key="item.id" class="flex flex-col items-center text-center group relative">
      
      <!-- Faint connecting line for desktop (skip for last item) -->
      <div v-if="idx < 3" class="hidden lg:block absolute top-6 left-[60%] right-[-40%] h-px bg-line/50" aria-hidden="true" />

      <!-- Icon -->
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 mb-4 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 relative z-10 border border-line/50 shadow-sm">
        <Icon :name="getIcon(idx)" class="w-5 h-5" />
      </div>
      
      <!-- Date -->
      <p class="text-sm font-extrabold text-ink mb-1">{{ format(item.timestamp) }}</p>
      
      <!-- Title -->
      <h3 class="text-sm font-bold text-ink-soft mb-1.5">{{ item.title }}</h3>
      
      <!-- Description -->
      <p class="text-xs text-ink-faint leading-relaxed px-4">{{ item.description }}</p>
    </div>
  </div>
</template>
