<script setup lang="ts">
// Dashboard metric tile: glyph, uppercase label, big value, optional caption
// and trend delta. Numeric values count up once on mount (motion-safe).
const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    icon: string
    tone?: 'brand' | 'ink' | 'green' | 'amber' | 'violet'
    caption?: string
    to?: string
    delta?: number | null
  }>(),
  { tone: 'brand', delta: null },
)

const tones: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-800 ring-brand-200',
  ink: 'bg-mist-2 text-ink ring-line',
  green: 'bg-green-50 text-green-700 ring-green-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  violet: 'bg-brand-50 text-brand-600 ring-brand-100',
}
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'div'))

// Count-up: only for plain numbers, and only when motion is welcome.
const numeric = computed(() =>
  typeof props.value === 'number' ? props.value : Number(String(props.value).replace(/,/g, '')),
)
const shown = ref<number | null>(null)
const display = computed(() => {
  if (shown.value === null || Number.isNaN(numeric.value)) return props.value
  return new Intl.NumberFormat('en-US').format(Math.round(shown.value))
})

onMounted(() => {
  if (Number.isNaN(numeric.value) || numeric.value === 0) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const target = numeric.value
  const start = performance.now()
  shown.value = 0
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 620)
    shown.value = target * (1 - Math.pow(1 - t, 3))
    if (t < 1) requestAnimationFrame(step)
    else shown.value = null
  }
  requestAnimationFrame(step)
})
</script>

<template>
  <component
    :is="tag"
    :to="to"
    class="group surface flex flex-col justify-between p-5 transition-all duration-200"
    :class="to ? 'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <span class="flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset" :class="tones[tone]">
        <Icon :name="icon" class="text-xl" />
      </span>
      <span
        v-if="delta !== null"
        class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold"
        :class="delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'"
        :title="`${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta)} versus the previous 7 days`"
      >
        <Icon :name="delta >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="text-sm" />
        {{ Math.abs(delta) }}
      </span>
      <Icon
        v-else-if="to"
        name="lucide:arrow-up-right"
        class="text-ink-faint transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700"
      />
    </div>
    <div class="mt-5">
      <p class="console-label">{{ label }}</p>
      <p class="mt-1 text-[1.9rem] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">{{ display }}</p>
      <p v-if="caption" class="mt-1.5 text-xs text-ink-soft">{{ caption }}</p>
    </div>
  </component>
</template>
