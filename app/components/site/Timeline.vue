<script setup lang="ts">
// Single timeline component (replaces the old ImportantDates duplicate).
// layout="horizontal": 4-up milestone row (home page).
// layout="vertical": stepper with status states (event detail).
export interface TimelineItem {
  id: string
  title: string
  description: string
  timestamp: string | Date
  status: 'completed' | 'active' | 'pending'
}

const props = withDefaults(defineProps<{ items: TimelineItem[]; layout?: 'horizontal' | 'vertical' }>(), {
  layout: 'vertical',
})

const horizontalIcons = ['lucide:flag', 'lucide:calendar', 'lucide:upload', 'lucide:medal', 'lucide:award']

function statusIcon(status: TimelineItem['status']) {
  if (status === 'completed') return 'lucide:check-circle-2'
  if (status === 'active') return 'lucide:circle-dot'
  return 'lucide:circle-dashed'
}

function statusColor(status: TimelineItem['status']) {
  if (status === 'completed') return 'text-brand-600 bg-brand-50 border-brand-200'
  if (status === 'active') return 'text-brand-700 bg-brand-100 border-brand-300'
  return 'text-ink-faint bg-mist-1 border-line'
}

function lineColor(status: TimelineItem['status']) {
  if (status === 'completed') return 'bg-brand-600'
  if (status === 'active') return 'bg-brand-300'
  return 'bg-line'
}

function format(date: string | Date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d)
}
</script>

<template>
  <!-- horizontal: milestone row -->
  <div v-if="layout === 'horizontal'" class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
    <div v-for="(item, idx) in items.slice(0, 4)" :key="item.id" class="group relative flex flex-col items-center text-center">
      <div v-if="idx < Math.min(items.length, 4) - 1" class="absolute left-[60%] right-[-40%] top-6 hidden h-px bg-line/50 lg:block" aria-hidden="true" />
      <div class="relative z-10 mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line/50 bg-white text-brand-600 shadow-sm transition-colors group-hover:bg-brand-50">
        <Icon :name="horizontalIcons[idx % horizontalIcons.length]" class="text-xl" />
      </div>
      <p class="mb-1 text-sm font-extrabold text-ink">{{ format(item.timestamp) }}</p>
      <h3 class="mb-1.5 text-sm font-bold text-ink-soft">{{ item.title }}</h3>
      <p class="px-4 text-xs leading-relaxed text-ink-faint">{{ item.description }}</p>
    </div>
  </div>

  <!-- vertical: status stepper -->
  <div v-else class="relative py-2">
    <ol class="space-y-8">
      <li v-for="(item, i) in items" :key="item.id" class="relative flex gap-6">
        <div class="flex flex-col items-center">
          <span
            class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm"
            :class="statusColor(item.status)"
          >
            <span v-if="item.status === 'active'" class="absolute -inset-1 animate-pulse rounded-full bg-brand-400 opacity-20" />
            <Icon :name="statusIcon(item.status)" class="text-xl" />
          </span>
          <span v-if="i < items.length - 1" class="absolute bottom-[-2rem] top-10 w-0.5" :class="lineColor(item.status)" />
        </div>
        <div class="flex-1 pb-2">
          <p class="text-xs font-bold uppercase tracking-wider text-brand-600">{{ format(item.timestamp) }}</p>
          <h3 class="mt-1 text-lg font-bold text-ink">{{ item.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-ink-soft">{{ item.description }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>
