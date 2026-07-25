<script setup lang="ts">
// Titled block inside a long form: label column on wide screens, stacked on
// narrow ones, so forms read as grouped steps rather than one flat list.
defineProps<{ title: string; description?: string; icon?: string }>()
</script>

<template>
  <section class="grid gap-4 border-b border-line pb-6 last:border-0 last:pb-0 lg:grid-cols-[15rem_1fr] lg:gap-8">
    <div class="lg:pt-1">
      <h3 class="flex items-center gap-2 text-sm font-bold text-ink">
        <Icon v-if="icon" :name="icon" class="text-brand-700" />
        {{ title }}
      </h3>
      <p v-if="description" class="mt-1 text-xs leading-relaxed text-ink-faint">{{ description }}</p>
    </div>
    <div class="min-w-0 space-y-4">
      <slot />
    </div>
  </section>
</template>
