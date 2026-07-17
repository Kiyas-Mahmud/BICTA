<script setup lang="ts">
// Dashboard metric tile: pastel icon square, uppercase label, big value,
// optional caption + trend delta.
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
  brand: 'bg-brand-100 text-brand-700',
  ink: 'bg-mist-2 text-ink',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-brand-50 text-brand-600',
}
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'div'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    class="group flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-soft transition-all"
    :class="to ? 'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift' : ''"
  >
    <div class="flex items-start justify-between">
      <span class="flex h-11 w-11 items-center justify-center rounded-xl" :class="tones[tone]">
        <Icon :name="icon" class="text-xl" />
      </span>
      <span
        v-if="delta !== null"
        class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold"
        :class="delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'"
      >
        <Icon :name="delta >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="text-sm" />
        {{ Math.abs(delta) }}
      </span>
      <Icon
        v-else-if="to"
        name="lucide:arrow-up-right"
        class="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
      />
    </div>
    <div class="mt-4">
      <p class="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-faint">{{ label }}</p>
      <p class="mt-1 text-3xl font-extrabold tracking-tight text-ink">{{ value }}</p>
      <p v-if="caption" class="mt-1 text-xs text-ink-soft">{{ caption }}</p>
    </div>
  </component>
</template>
