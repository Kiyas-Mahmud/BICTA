<script setup lang="ts">
// Registration drop-off, stage by stage.
//
// ONE colour, not five. These are ordered stages of a single series, not five
// competing identities — giving each its own hue implies they are different
// kinds of thing and burns categorical slots that carry no meaning. Depth
// comes from opacity down the funnel instead.
import { ACCENT, INK, baseOption, FONT_FAMILY } from '~/utils/chartTheme'

const props = defineProps<{
  stages: Array<{ key: string; label: string; value: number; meta?: { anyStatus?: number } }>
  height?: number
}>()

const option = computed(() => {
  const base = baseOption()
  const top = props.stages[0]?.value ?? 0

  return {
    ...base,
    grid: { left: 8, right: 8, top: 8, bottom: 8 },
    tooltip: {
      ...base.tooltip,
      trigger: 'item',
      formatter: (p: any) => {
        const pct = top ? Math.round((p.value / top) * 100) : 0
        return `<b>${p.name}</b><br/>${p.value} of ${top} (${pct}%)`
      },
    },
    series: [
      {
        type: 'funnel',
        // Ordered stages, so keep source order rather than re-sorting by size.
        sort: 'none',
        gap: 2, // the surface gap that separates touching fills
        left: '4%',
        right: '4%',
        minSize: '18%',
        label: {
          position: 'inside',
          color: '#ffffff',
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 12,
          formatter: (p: any) => `${p.name}  ${p.value}`,
        },
        labelLine: { show: false },
        itemStyle: { borderWidth: 0 },
        data: props.stages.map((s, i) => ({
          name: s.label,
          value: s.value,
          itemStyle: {
            color: ACCENT,
            // Later stages recede slightly, so the eye reads top-to-bottom.
            opacity: 1 - i * 0.13,
          },
        })),
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY, color: INK.soft },
  }
})

const caption = computed(
  () => `Registration funnel: ${props.stages.map((s) => `${s.label} ${s.value}`).join(', ')}.`,
)
</script>

<template>
  <AdminChartsBase :option="option" :height="height ?? 260" :caption="caption" />
</template>
