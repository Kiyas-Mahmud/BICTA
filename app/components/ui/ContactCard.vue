<script setup lang="ts">
export interface ContactInfo {
  icon: string
  label: string
  value: string
  className?: string
}

defineProps<{
  title: string
  description?: string
  contactInfo: ContactInfo[]
}>()
</script>

<template>
  <div class="grid overflow-hidden rounded-2xl border border-line bg-white shadow-soft md:grid-cols-2 text-left">
    <div class="bg-mist-1 p-8 sm:p-10 lg:p-12">
      <h2 class="text-3xl font-extrabold tracking-tight text-ink">{{ title }}</h2>
      <p v-if="description" class="mt-4 text-ink-soft leading-relaxed">{{ description }}</p>
      
      <div class="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
        <div v-for="(info, i) in contactInfo" :key="i" class="flex flex-col gap-2" :class="info.className">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-line shadow-sm text-brand-600">
              <Icon :name="info.icon" class="text-lg" />
            </span>
            <span class="text-sm font-bold tracking-wide uppercase text-ink-faint">{{ info.label }}</span>
          </div>
          <p class="font-bold text-ink pl-13">{{ info.value }}</p>
        </div>
      </div>
    </div>
    
    <div class="p-8 sm:p-10 lg:p-12 bg-white">
      <slot />
    </div>
  </div>
</template>
