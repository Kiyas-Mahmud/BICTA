<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  as?: string
  href?: string
  disabled?: boolean
}>(), {
  variant: 'default',
  size: 'default',
  as: 'button'
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'default': return 'bg-brand-600 text-white shadow hover:bg-brand-700'
    case 'destructive': return 'bg-red-500 text-white shadow-sm hover:bg-red-600'
    case 'outline': return 'border border-line bg-white shadow-sm hover:bg-mist-1'
    case 'secondary': return 'bg-mist-2 text-ink shadow-sm hover:bg-mist-3'
    case 'ghost': return 'hover:bg-mist-1 text-ink'
    case 'link': return 'text-brand-600 underline-offset-4 hover:underline'
  }
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'default': return 'h-9 px-4 py-2'
    case 'sm': return 'h-8 rounded-md px-3 text-xs'
    case 'lg': return 'h-10 rounded-md px-8'
    case 'icon': return 'h-9 w-9'
  }
})
</script>

<template>
  <component
    :is="href ? 'a' : as"
    :href="href"
    :disabled="disabled"
    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-50"
    :class="[variantClass, sizeClass]"
  >
    <slot />
  </component>
</template>
