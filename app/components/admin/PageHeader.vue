<script setup lang="ts">
// Consistent page opening for every admin screen: optional back link, title,
// supporting line, and a right-hand action slot that wraps on small screens.
defineProps<{
  title: string
  subtitle?: string
  icon?: string
  backTo?: string
  backLabel?: string
}>()
</script>

<template>
  <header class="fade-up">
    <NuxtLink
      v-if="backTo"
      :to="backTo"
      class="mb-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-ink-faint transition-colors hover:text-brand-700"
    >
      <Icon name="lucide:arrow-left" /> {{ backLabel ?? 'Back' }}
    </NuxtLink>

    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div class="flex min-w-0 items-start gap-3.5">
        <span v-if="icon" class="panel-glyph mt-0.5 h-11 w-11 rounded-2xl text-xl">
          <Icon :name="icon" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="console-title">{{ title }}</h1>
            <slot name="badge" />
          </div>
          <p v-if="subtitle || $slots.subtitle" class="console-sub">
            <slot name="subtitle">{{ subtitle }}</slot>
          </p>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2.5">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
