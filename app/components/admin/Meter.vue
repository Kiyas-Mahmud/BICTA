<script setup lang="ts">
// A single ratio against a limit. Deliberately NOT a chart: a two-slice donut
// for "62% collected" is an anti-pattern — the reader has to compare arc
// lengths to learn one number.
//
// The unfilled track is a lighter step of the same ramp (never gray), so the
// bar reads as one scale rather than "fill on top of background".
import { SEQUENTIAL, sequentialAt } from '~/utils/chartTheme'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    label?: string
    /** Right-hand caption. Defaults to "value / max". */
    caption?: string
    /** Ramp the fill by how full it is, rather than a flat accent. */
    ramped?: boolean
    size?: 'sm' | 'md'
  }>(),
  { ramped: false, size: 'md' },
)

// A zero denominator is "nothing to do", not 0% — those read very differently
// to someone deciding whether to act.
const hasScale = computed(() => props.max > 0)
const ratio = computed(() => (hasScale.value ? Math.min(1, props.value / props.max) : 0))
const pct = computed(() => Math.round(ratio.value * 100))

// Darker end of the ramp as the bar fills; the track is its lightest step.
const fill = computed(() => (props.ramped ? sequentialAt(ratio.value) : SEQUENTIAL[5]))
</script>

<template>
  <div>
    <div v-if="label || caption || hasScale" class="mb-1.5 flex items-baseline justify-between gap-3">
      <span v-if="label" class="truncate text-sm font-semibold text-ink">{{ label }}</span>
      <span class="shrink-0 text-xs text-ink-faint">
        <template v-if="caption">{{ caption }}</template>
        <template v-else-if="hasScale">
          <span class="font-bold text-ink">{{ value }}</span> / {{ max }}
          <span class="ml-1">({{ pct }}%)</span>
        </template>
        <template v-else>Nothing to track yet</template>
      </span>
    </div>

    <div
      class="w-full overflow-hidden rounded-full"
      :class="size === 'sm' ? 'h-1.5' : 'h-2.5'"
      :style="{ backgroundColor: SEQUENTIAL[0] }"
      role="progressbar"
      :aria-valuenow="pct"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label ?? 'Progress'"
    >
      <div
        class="h-full rounded-full transition-[width] duration-700 ease-liquid"
        :style="{ width: `${pct}%`, backgroundColor: fill }"
      />
    </div>
  </div>
</template>
