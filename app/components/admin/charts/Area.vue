<script setup lang="ts">
// Registrations per day. A single series over time, so: sequential colour, an
// area fill for the magnitude, and a crosshair rather than per-point labels.
import { ACCENT, INK, MARKS, baseOption, FONT_FAMILY } from '~/utils/chartTheme'

const props = defineProps<{
  series: Array<{ day: string; label: string; value: number }>
  height?: number
}>()

const total = computed(() => props.series.reduce((a, d) => a + d.value, 0))

const option = computed(() => {
  const base = baseOption()
  return {
    ...base,
    tooltip: {
      ...base.tooltip,
      trigger: 'axis',
      // Crosshair, not a dot tooltip: on a dense daily series the reader is
      // asking "what happened on this date", not "what is this pixel".
      axisPointer: { type: 'line', lineStyle: { color: INK.faint, type: 'dashed' } },
      formatter: (p: any) => {
        const pt = Array.isArray(p) ? p[0] : p
        return `<b>${pt.value}</b> registration${pt.value === 1 ? '' : 's'}<br/>${pt.axisValue}`
      },
    },
    xAxis: {
      type: 'category',
      ...base.categoryAxis,
      data: props.series.map((d) => d.label),
      // Thin the labels rather than let them collide.
      axisLabel: { ...base.categoryAxis.axisLabel, interval: Math.max(0, Math.floor(props.series.length / 8) - 1) },
    },
    yAxis: {
      type: 'value',
      ...base.valueAxis,
      minInterval: 1, // whole registrations only
    },
    series: [
      {
        type: 'line',
        smooth: 0.3,
        showSymbol: false,
        lineStyle: { width: MARKS.lineWidth, color: ACCENT },
        itemStyle: { color: ACCENT },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(94,111,84,0.28)' },
              { offset: 1, color: 'rgba(94,111,84,0.02)' },
            ],
          },
        },
        data: props.series.map((d) => d.value),
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY, color: INK.soft },
  }
})

const caption = computed(
  () => `Registrations per day. ${total.value} total across ${props.series.length} days.`,
)
</script>

<template>
  <AdminChartsBase :option="option" :height="height ?? 220" :caption="caption" />
</template>
