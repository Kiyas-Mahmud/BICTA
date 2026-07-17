<script setup lang="ts">
// Dependency-free bar chart (flex columns). Sage gradient fill over a light
// track, hover tooltip per column. Used for the registration trend.
const props = withDefaults(
  defineProps<{ data: { label: string; value: number }[]; height?: number }>(),
  { height: 180 },
)

const max = computed(() => Math.max(1, ...props.data.map((d) => d.value)))
const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))
// Keep the x-axis readable: show every label for short series, else thin out.
const step = computed(() => (props.data.length > 10 ? 2 : 1))
</script>

<template>
  <div>
    <div class="flex items-end gap-1.5" :style="{ height: `${height}px` }">
      <div v-for="(d, i) in data" :key="i" class="group relative flex h-full flex-1 flex-col justify-end">
        <!-- tooltip -->
        <div class="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-center text-[0.65rem] font-semibold text-white opacity-0 shadow-lift transition-opacity group-hover:opacity-100">
          {{ d.value }} reg{{ d.value === 1 ? '' : 's' }}
          <span class="block text-[0.6rem] font-normal text-white/70">{{ d.label }}</span>
        </div>
        <!-- track + fill -->
        <div class="relative w-full overflow-hidden rounded-lg bg-mist-1" style="height: 100%">
          <div
            class="absolute inset-x-0 bottom-0 rounded-lg bg-gradient-brand transition-all duration-500 group-hover:brightness-110"
            :style="{ height: `${Math.max(d.value === 0 ? 0 : 6, (d.value / max) * 100)}%` }"
          />
        </div>
      </div>
    </div>
    <div class="mt-2 flex gap-1.5">
      <div v-for="(d, i) in data" :key="i" class="flex-1 text-center text-[0.6rem] font-medium text-ink-faint">
        <span v-if="i % step === 0">{{ d.label }}</span>
      </div>
    </div>
    <p class="mt-1 text-center text-xs text-ink-faint">{{ total }} in the last {{ data.length }} days</p>
  </div>
</template>
