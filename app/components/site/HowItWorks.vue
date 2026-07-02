<script setup lang="ts">
// DB-backed steps (admin > How It Works). Page provides the section wrapper +
// heading; this renders the step grid only.
export interface HowItWorksItem {
  id: number
  title: string
  body: string
  icon?: string | null
}

defineProps<{ steps: HowItWorksItem[] }>()

function iconName(icon?: string | null) {
  if (!icon) return 'lucide:sparkles'
  return icon.includes(':') ? icon : `lucide:${icon}`
}
</script>

<template>
  <div class="relative grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
    <!-- connecting dashed line (desktop) -->
    <div class="absolute left-[12%] right-[12%] top-10 hidden border-t border-dashed border-line/60 lg:block" aria-hidden="true" />

    <div v-for="(item, index) in steps" :key="item.id" class="group relative flex flex-col items-center text-center">
      <div class="relative mb-6">
        <div class="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-mist-2 bg-white text-brand-600 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:border-brand-200">
          <Icon :name="iconName(item.icon)" class="text-3xl" />
        </div>
        <div class="absolute -right-3 -top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white ring-4 ring-white">
          {{ index + 1 }}
        </div>
      </div>
      <h3 class="mb-2 text-lg font-bold text-ink">{{ item.title }}</h3>
      <p class="px-2 text-sm leading-relaxed text-ink-soft">{{ item.body }}</p>
    </div>
  </div>
</template>
