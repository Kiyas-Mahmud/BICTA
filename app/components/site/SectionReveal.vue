<script setup lang="ts">
// Fade + 16px slide-up on first viewport entry. CSS handles the motion so
// prefers-reduced-motion is respected for free (see main.css).
const props = defineProps<{ delay?: number }>()

const el = ref<HTMLElement>()
const shown = ref(false)

onMounted(() => {
  // The hidden state is only safe while JS is definitely running: content
  // starts at opacity 0, so anything that stops this hook (no observer
  // support, an aborted hydration) would hide the section permanently.
  if (!el.value || !('IntersectionObserver' in window)) {
    shown.value = true
    return
  }

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

  // Last resort: reveal anyway if the observer never reports back.
  const failsafe = setTimeout(() => {
    shown.value = true
    io.disconnect()
  }, 3000)
  onBeforeUnmount(() => {
    clearTimeout(failsafe)
    io.disconnect()
  })
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
