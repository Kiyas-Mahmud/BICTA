<script setup lang="ts">
// Thin wrapper over the design-system button classes (main.css) so every
// button on the site shares one visual language. API kept compatible.
import { computed, resolveComponent } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  as?: string
  href?: string
  to?: string
  disabled?: boolean
}>(), {
  variant: 'default',
  size: 'default',
  as: 'button',
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'default': return 'btn-primary'
    case 'destructive': return 'btn-primary !bg-red-600 hover:!bg-red-700 !shadow-none'
    case 'outline':
    case 'secondary': return 'btn-secondary'
    case 'ghost': return 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-mist-1 hover:text-ink'
    case 'link': return 'link-underline inline-flex items-center gap-1.5 text-sm text-brand-600'
  }
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return '!px-4 !py-2 !text-xs'
    case 'lg': return '!px-7 !py-3.5'
    case 'icon': return '!h-10 !w-10 !p-0'
    default: return ''
  }
})

const tag = computed(() => {
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return props.as === 'NuxtLink' ? resolveComponent('NuxtLink') : props.as
})
</script>

<template>
  <component
    :is="tag"
    :href="href"
    :to="to"
    :disabled="disabled"
    class="disabled:pointer-events-none disabled:opacity-50"
    :class="[variantClass, sizeClass]"
  >
    <slot />
  </component>
</template>
