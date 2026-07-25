<script setup lang="ts">
// Small tab-like filter control (All / Published / Draft…). Uses aria-pressed
// so the active option is announced, and arrow keys move between options.
const props = defineProps<{ options: { value: string; label: string; count?: number }[]; ariaLabel?: string }>()
const model = defineModel<string>({ default: '' })

function onKey(e: KeyboardEvent, i: number) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
  e.preventDefault()
  const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + props.options.length) % props.options.length
  model.value = props.options[next]!.value
  const el = (e.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement | undefined
  el?.focus()
}
</script>

<template>
  <div class="segmented" role="group" :aria-label="ariaLabel ?? 'Filter'">
    <button
      v-for="(o, i) in options"
      :key="o.value"
      type="button"
      class="segmented-btn"
      :aria-pressed="model === o.value"
      @click="model = o.value"
      @keydown="onKey($event, i)"
    >
      {{ o.label }}
      <span v-if="o.count !== undefined" class="ml-1 opacity-60">{{ o.count }}</span>
    </button>
  </div>
</template>
