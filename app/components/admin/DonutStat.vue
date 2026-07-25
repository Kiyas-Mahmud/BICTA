<script setup lang="ts">
// Segmented ring chart (SVG). Uses the r=15.915 trick so each segment's
// dasharray equals its percentage. Center shows a total + caption; the ring
// draws itself in on mount when motion is allowed.
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

const drawn = ref(false)
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawn.value = true
    return
  }
  requestAnimationFrame(() => (drawn.value = true))
})
</script>

<template>
  <div class="flex flex-col items-center gap-5 sm:flex-row">
    <div class="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90" role="img" :aria-label="`${centerValue} ${centerLabel}`">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--donut-track, #eef1f3)" stroke-width="3.4" />
        <circle
          v-for="(a, i) in arcs"
          :key="i"
          cx="18"
          cy="18"
          r="15.915"
          fill="none"
          :stroke="a.color"
          stroke-width="3.4"
          stroke-linecap="round"
          :stroke-dasharray="drawn ? `${a.pct} ${100 - a.pct}` : '0 100'"
          :stroke-dashoffset="a.offset"
          style="transition: stroke-dasharray 800ms cubic-bezier(0.22, 1, 0.36, 1)"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="text-2xl font-extrabold tracking-tight text-ink tabular-nums">{{ centerValue }}</span>
        <span class="console-label">{{ centerLabel }}</span>
      </div>
    </div>

    <ul class="w-full min-w-0 flex-1 space-y-2.5">
      <li v-for="(s, i) in arcs" :key="i" class="flex items-center gap-2.5 text-sm">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: s.color }" />
        <span class="flex-1 truncate text-ink-soft">{{ s.label }}</span>
        <span class="font-bold tabular-nums text-ink">{{ s.value }}</span>
        <span class="w-10 shrink-0 text-right text-xs tabular-nums text-ink-faint">{{ Math.round(s.pct) }}%</span>
      </li>
    </ul>
  </div>
</template>
