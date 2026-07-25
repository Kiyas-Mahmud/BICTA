<script setup lang="ts">
// Dependency-free bar chart (flex columns) with a baseline grid, sage fill and
// a hover tooltip per column. Bars grow in once, motion permitting.
const props = withDefaults(
  defineProps<{ data: { label: string; value: number }[]; height?: number }>(),
  { height: 190 },
)

const max = computed(() => Math.max(1, ...props.data.map((d) => d.value)))
const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))
const peak = computed(() =>
  props.data.reduce((a, b) => (b.value > a.value ? b : a), props.data[0] ?? { label: '', value: 0 }),
)
// Keep the x-axis readable: show every label for short series, else thin out.
const step = computed(() => (props.data.length > 10 ? 3 : 1))

const grown = ref(false)
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    grown.value = true
    return
  }
  requestAnimationFrame(() => (grown.value = true))
})

function barHeight(v: number) {
  if (!grown.value) return '0%'
  return `${Math.max(v === 0 ? 2 : 6, (v / max.value) * 100)}%`
}
</script>

<template>
  <figure>
    <figcaption class="sr-only">
      Registrations per day for the last {{ data.length }} days. Total {{ total }}, peak {{ peak.value }} on {{ peak.label }}.
    </figcaption>

    <div class="relative" :style="{ height: `${height}px` }" aria-hidden="true">
      <!-- baseline grid -->
      <div class="pointer-events-none absolute inset-0 flex flex-col justify-between">
        <span v-for="g in 4" :key="g" class="block border-t border-dashed border-line/70" />
      </div>

      <div class="relative flex h-full items-end gap-1.5">
        <div v-for="(d, i) in data" :key="i" class="group relative flex h-full flex-1 flex-col justify-end">
          <div class="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-center text-[0.65rem] font-bold text-white opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100">
            {{ d.value }} registration{{ d.value === 1 ? '' : 's' }}
            <span class="block text-[0.6rem] font-medium text-white/70">{{ d.label }}</span>
          </div>
          <div
            class="w-full rounded-t-md bg-gradient-brand transition-[height,filter] duration-700 ease-liquid group-hover:brightness-110"
            :style="{ height: barHeight(d.value) }"
          />
        </div>
      </div>
    </div>

    <div class="mt-2 flex gap-1.5">
      <div v-for="(d, i) in data" :key="i" class="min-w-0 flex-1 truncate text-center text-[0.6rem] font-semibold text-ink-faint">
        <span v-if="i % step === 0">{{ d.label }}</span>
      </div>
    </div>
    <p class="mt-2.5 border-t border-line pt-2.5 text-xs text-ink-faint">
      <span class="font-bold text-ink">{{ total }}</span> in the last {{ data.length }} days
      <span v-if="peak.value"> · peak {{ peak.value }} on {{ peak.label }}</span>
    </p>
  </figure>
</template>
