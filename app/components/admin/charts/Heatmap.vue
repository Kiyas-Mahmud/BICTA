<script setup lang="ts">
// Collection coverage: checkpoints down, competitions across, cell = share of
// eligible people who collected. A grid of magnitudes, so: sequential ramp,
// one hue, more-is-darker. Never categorical here — the columns are not
// identities competing for attention, they are just where the number sits.
import { SEQUENTIAL, INK, baseOption, FONT_FAMILY } from '~/utils/chartTheme'

const props = defineProps<{
  checkpoints: Array<{ id: number; name: string; competitionId: number | null }>
  columns: Array<{ id: number | null; name: string; eligible: number }>
  cells: Array<{ checkpointId: number; competitionId: number | null; collected: number }>
  height?: number
}>()

const key = (id: number | null) => (id === null ? 'event-wide' : String(id))

const data = computed(() => {
  const byCell = new Map(props.cells.map((c) => [`${c.checkpointId}:${key(c.competitionId)}`, c.collected]))
  const out: Array<[number, number, number, number, number]> = []

  props.checkpoints.forEach((cp, y) => {
    props.columns.forEach((col, x) => {
      // A competition-scoped desk only serves its own competition; leave the
      // other cells empty rather than drawing a misleading 0%.
      if (cp.competitionId !== null && cp.competitionId !== col.id) return
      const collected = byCell.get(`${cp.id}:${key(col.id)}`) ?? 0
      const pct = col.eligible > 0 ? Math.round((collected / col.eligible) * 100) : 0
      out.push([x, y, pct, collected, col.eligible])
    })
  })
  return out
})

const option = computed(() => {
  const base = baseOption()
  return {
    ...base,
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...base.tooltip,
      formatter: (p: any) => {
        const [x, y, pct, collected, eligible] = p.value
        return `<b>${props.checkpoints[y]?.name}</b><br/>${props.columns[x]?.name}<br/>${collected} of ${eligible} (${pct}%)`
      },
    },
    xAxis: {
      type: 'category',
      data: props.columns.map((c) => c.name),
      splitArea: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK.faint, fontSize: 11, interval: 0, width: 90, overflow: 'truncate' },
    },
    yAxis: {
      type: 'category',
      data: props.checkpoints.map((c) => c.name),
      splitArea: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK.soft, fontSize: 11, fontWeight: 600 },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      show: false,
      inRange: { color: [...SEQUENTIAL] },
    },
    series: [
      {
        type: 'heatmap',
        data: data.value,
        // The value the reader wants is the number, so print it in the cell —
        // this is a small grid, not a dense matrix.
        label: {
          show: true,
          formatter: (p: any) => `${p.value[2]}%`,
          color: INK.primary,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: FONT_FAMILY,
        },
        itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 6 },
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY, color: INK.soft },
  }
})

const caption = computed(
  () => `Collection coverage by checkpoint and competition, ${data.value.length} cells.`,
)
</script>

<template>
  <AdminChartsBase
    :option="option"
    :height="height ?? Math.max(180, checkpoints.length * 52 + 60)"
    :caption="caption"
  />
</template>
