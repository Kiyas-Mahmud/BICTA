<script setup lang="ts">
export interface TimelineItem {
  id: string
  title: string
  description: string
  timestamp: string | Date
  status: 'completed' | 'active' | 'pending'
}

defineProps<{ items: TimelineItem[] }>()

function getIcon(status: string) {
  if (status === 'completed') return 'lucide:check-circle-2'
  if (status === 'active') return 'lucide:circle-dot'
  return 'lucide:circle-dashed'
}

function getColor(status: string) {
  if (status === 'completed') return 'text-brand-600 bg-brand-50 border-brand-200'
  if (status === 'active') return 'text-blue-600 bg-blue-50 border-blue-200'
  return 'text-ink-faint bg-mist-1 border-line'
}

function getLineColor(status: string) {
  if (status === 'completed') return 'bg-brand-600'
  if (status === 'active') return 'bg-blue-300'
  return 'bg-line'
}

function format(date: string | Date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)
}
</script>

<template>
  <div class="relative py-2">
    <ol class="space-y-8">
      <li v-for="(item, i) in items" :key="item.id" class="relative flex gap-6">
        <div class="flex flex-col items-center">
          <span 
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm z-10 relative"
            :class="getColor(item.status)"
          >
            <!-- Glowing ring for active status -->
            <span v-if="item.status === 'active'" class="absolute -inset-1 rounded-full bg-blue-400 opacity-20 animate-pulse" />
            <Icon :name="getIcon(item.status)" class="text-xl" />
          </span>
          <span v-if="i < items.length - 1" class="absolute top-10 bottom-[-2rem] w-0.5" :class="getLineColor(item.status)" />
        </div>
        <div class="flex-1 pb-2">
          <p class="text-xs font-bold tracking-wider text-brand-600 uppercase">{{ format(item.timestamp) }}</p>
          <h3 class="mt-1 text-lg font-bold text-ink">{{ item.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-ink-soft">{{ item.description }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>
