<script setup lang="ts">
// Fade + 16px slide-up on first viewport entry. CSS handles the motion so
// prefers-reduced-motion is respected for free (see main.css).
const props = defineProps<{ delay?: number }>()

const el = ref<HTMLElement>()
const shown = ref(false)

onMounted(() => {
  if (!el.value) return
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        shown.value = true
        io.disconnect()
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  )
  io.observe(el.value)
})
</script>

<template>
  <div
    ref="el"
    class="reveal"
    :class="{ 'reveal-shown': shown }"
    :style="delay ? { transitionDelay: `${delay}ms` } : undefined"
  >
    <slot />
  </div>
</template>
