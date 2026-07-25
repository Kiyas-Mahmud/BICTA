<script setup lang="ts">
// Card with an optional titled header row. `flush` drops the body padding for
// panels that hold a full-bleed table or media grid.
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    icon?: string
    flush?: boolean
  }>(),
  { flush: false },
)
</script>

<template>
  <section class="surface overflow-hidden">
    <div v-if="title || $slots.head" class="panel-head">
      <div class="flex min-w-0 items-center gap-3">
        <span v-if="icon" class="panel-glyph"><Icon :name="icon" /></span>
        <div class="min-w-0">
          <h2 class="console-h2 truncate">{{ title }}</h2>
          <p v-if="subtitle" class="mt-0.5 text-xs text-ink-faint">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
      <slot name="head" />
    </div>

    <div :class="flush ? '' : 'panel-body'">
      <slot />
    </div>
  </section>
</template>
