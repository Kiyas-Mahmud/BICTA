<script setup lang="ts">
// The one place ECharts is wired up. Every chart component renders through
// this, so tree-shaken imports, theming and the client-only guard exist once.
//
// ECharts draws to canvas and touches `window`, so it cannot render on the
// server — on Cloudflare Workers an unguarded import is an SSR crash. The
// <ClientOnly> fallback is a SIZED skeleton, not a spinner: without a matching
// height the whole dashboard jumps when charts hydrate.
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, FunnelChart, HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  MarkLineComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

// Registered once at module scope — importing only what we draw is what keeps
// this at a fraction of the full ~1MB bundle.
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  FunnelChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  MarkLineComponent,
])

withDefaults(
  defineProps<{
    option: Record<string, any>
    height?: number
    /** Screen-reader description; a chart with no text alternative is unreadable. */
    caption?: string
  }>(),
  { height: 240 },
)
</script>

<template>
  <figure class="m-0">
    <figcaption v-if="caption" class="sr-only">{{ caption }}</figcaption>
    <ClientOnly>
      <VChart :option="option" :style="{ height: `${height}px`, width: '100%' }" autoresize />
      <template #fallback>
        <div class="skel w-full rounded-xl" :style="{ height: `${height}px` }" />
      </template>
    </ClientOnly>
  </figure>
</template>
