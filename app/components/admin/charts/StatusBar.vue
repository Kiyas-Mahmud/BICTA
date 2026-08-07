<script setup lang="ts">
// Registration status per competition: part-to-whole, one row each.
//
// Horizontal because competition names are long — rotated x-labels are a
// readability tax for no benefit. Colours are the RESERVED status palette, and
// the legend is mandatory: status must never be conveyed by colour alone.
import { STATUS, INK, MARKS, baseOption, FONT_FAMILY } from '~/utils/chartTheme'

const props = defineProps<{
  rows: Array<{ name: string; teams: { confirmed: number; pending: number; rejected: number } }>
  height?: number
}>()

// Longest bars at the bottom: ECharts' y-axis runs upward, so reversing here
// puts the biggest competition at the top where the eye starts.
const ordered = computed(() =>
  [...props.rows]
    .sort(
      (a, b) =>
        a.teams.confirmed + a.teams.pending + a.teams.rejected -
        (b.teams.confirmed + b.teams.pending + b.teams.rejected),
    ),
)

const SERIES = [
  { key: 'confirmed', label: 'Selected', color: STATUS.confirmed },
  { key: 'pending', label: 'Awaiting review', color: STATUS.pending },
  { key: 'rejected', label: 'Not selected', color: STATUS.rejected },
] as const

const option = computed(() => {
  const base = baseOption()
  return {
    ...base,
    grid: { left: 8, right: 24, top: 34, bottom: 4, containLabel: true },
    legend: {
      show: true, // never colour-alone
      top: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: { color: INK.soft, fontSize: 11, fontFamily: FONT_FAMILY },
      icon: 'roundRect',
    },
    tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', ...base.valueAxis, minInterval: 1 },
    yAxis: {
      type: 'category',
      ...base.categoryAxis,
      data: ordered.value.map((r) => r.name),
      axisLabel: { ...base.categoryAxis.axisLabel, color: INK.soft, fontWeight: 600 },
    },
    series: SERIES.map((s, i) => ({
      name: s.label,
      type: 'bar',
      stack: 'status',
      barMaxWidth: 18,
      itemStyle: {
        color: s.color,
        // 2px surface gap so touching segments stay distinct, and a rounded
        // outer end on the last series only.
        borderColor: '#ffffff',
        borderWidth: MARKS.surfaceGap,
        borderRadius: i === SERIES.length - 1 ? [0, MARKS.radius, MARKS.radius, 0] : 0,
      },
      data: ordered.value.map((r) => r.teams[s.key]),
    })),
    textStyle: { fontFamily: FONT_FAMILY, color: INK.soft },
  }
})

const caption = computed(() =>
  ordered.value
    .map((r) => `${r.name}: ${r.teams.confirmed} selected, ${r.teams.pending} awaiting, ${r.teams.rejected} not selected`)
    .join('. '),
)
</script>

<template>
  <AdminChartsBase :option="option" :height="height ?? Math.max(160, ordered.length * 46 + 50)" :caption="caption" />
</template>
