<script setup lang="ts">
defineProps<{ milestones: { id: number; label: string; date?: string | null; note?: string | null }[] }>()
const icons = ['lucide:flag', 'lucide:calendar-x', 'lucide:upload', 'lucide:medal', 'lucide:award']
</script>

<template>
  <!-- horizontal on desktop, vertical on mobile -->
  <div class="relative">
    <!-- desktop -->
    <div class="hidden md:block">
      <div class="relative grid" :style="{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }">
        <div class="absolute left-0 right-0 top-6 h-px bg-line" />
        <div
          v-for="(m, i) in milestones"
          :key="m.id"
          class="relative flex flex-col items-center px-3 text-center"
        >
          <span class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white text-brand-600 shadow-soft">
            <Icon :name="icons[i % icons.length]" />
          </span>
          <p v-if="m.date" class="mt-3 text-sm font-bold text-ink">{{ formatDate(m.date) }}</p>
          <p class="mt-1 text-sm font-semibold text-ink-soft">{{ m.label }}</p>
          <p v-if="m.note" class="mt-0.5 text-xs text-ink-faint">{{ m.note }}</p>
        </div>
      </div>
    </div>
    <!-- mobile -->
    <ol class="space-y-6 md:hidden">
      <li v-for="(m, i) in milestones" :key="m.id" class="flex gap-4">
        <div class="flex flex-col items-center">
          <span class="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-brand-600 shadow-soft">
            <Icon :name="icons[i % icons.length]" />
          </span>
          <span v-if="i < milestones.length - 1" class="mt-1 w-px flex-1 bg-line" />
        </div>
        <div class="-mt-0.5 pb-2">
          <p v-if="m.date" class="text-sm font-bold text-ink">{{ formatDate(m.date) }}</p>
          <p class="text-sm font-semibold text-ink-soft">{{ m.label }}</p>
          <p v-if="m.note" class="text-xs text-ink-faint">{{ m.note }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>
