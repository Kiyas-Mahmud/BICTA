<script setup lang="ts">
// Segmented ring chart (SVG). Uses the r=15.915 trick so each segment's
// dasharray equals its percentage. Center shows a total + caption.
const props = defineProps<{
  segments: { label: string; value: number; color: string }[]
  centerValue: string | number
  centerLabel: string
}>()

const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0) || 0)
const arcs = computed(() => {
  let acc = 0
  return props.segments.map((s) => {
    const pct = total.value ? (s.value / total.value) * 100 : 0
    const arc = { ...s, pct, offset: 25 - acc }
    acc += pct
    return arc
  })
})
</script>

<template>
  <div class="flex items-center gap-5">
    <div class="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--donut-track, #eef1f3)" stroke-width="3.6" />
        <circle
          v-for="(a, i) in arcs"
          :key="i"
          cx="18"
          cy="18"
          r="15.915"
          fill="none"
          :stroke="a.color"
          stroke-width="3.6"
          stroke-linecap="round"
          :stroke-dasharray="`${a.pct} ${100 - a.pct}`"
          :stroke-dashoffset="a.offset"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="text-2xl font-extrabold tracking-tight text-ink">{{ centerValue }}</span>
        <span class="text-[0.62rem] font-semibold uppercase tracking-wider text-ink-faint">{{ centerLabel }}</span>
      </div>
    </div>
    <ul class="min-w-0 flex-1 space-y-2">
      <li v-for="(s, i) in segments" :key="i" class="flex items-center gap-2 text-sm">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: s.color }" />
        <span class="flex-1 truncate text-ink-soft">{{ s.label }}</span>
        <span class="font-bold text-ink">{{ s.value }}</span>
      </li>
    </ul>
  </div>
</template>
