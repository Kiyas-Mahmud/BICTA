<script setup lang="ts">
/**
 * TiltCard — 3D tilt effect on hover with optional glare.
 * Vue 3 port of the React TiltCard from instructions.
 * Uses CSS transforms + springs via requestAnimationFrame for smooth motion.
 */
const props = withDefaults(
  defineProps<{
    max?: number
    glare?: boolean
  }>(),
  { max: 12, glare: true },
)

const cardRef = ref<HTMLElement>()
const canHover = ref(false)
const prefersReduced = ref(false)

// Motion values
const rx = ref(0)
const ry = ref(0)
const gx = ref(50)
const gy = ref(50)

// Smoothed (spring-like) values
const srx = ref(0)
const sry = ref(0)

const enabled = computed(() => !prefersReduced.value && canHover.value)

// Simple spring interpolation
let rafId: number | null = null
const SPRING_FACTOR = 0.12
const DAMPING = 0.85

function animate() {
  srx.value += (rx.value - srx.value) * SPRING_FACTOR
  sry.value += (ry.value - sry.value) * SPRING_FACTOR

  // Dampen small residuals
  if (Math.abs(rx.value - srx.value) < 0.01 && Math.abs(ry.value - sry.value) < 0.01) {
    srx.value = rx.value
    sry.value = ry.value
    rafId = null
    return
  }
  rafId = requestAnimationFrame(animate)
}

function startAnimation() {
  if (!rafId) rafId = requestAnimationFrame(animate)
}

function onMove(e: MouseEvent) {
  const el = cardRef.value
  if (!el || !enabled.value) return
  const rect = el.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width
  const py = (e.clientY - rect.top) / rect.height
  ry.value = (px - 0.5) * props.max
  rx.value = (0.5 - py) * props.max
  gx.value = px * 100
  gy.value = py * 100
  startAnimation()
}

function onLeave() {
  rx.value = 0
  ry.value = 0
  startAnimation()
}

const cardTransform = computed(
  () => `perspective(1000px) rotateX(${srx.value.toFixed(2)}deg) rotateY(${sry.value.toFixed(2)}deg)`,
)

const glareBackground = computed(
  () => `radial-gradient(circle at ${gx.value}% ${gy.value}%, rgba(255,255,255,0.25), transparent 50%)`,
)

onMounted(() => {
  if (typeof window === 'undefined') return
  // Check hover capability
  if (window.matchMedia) {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    canHover.value = mq.matches
    const update = () => (canHover.value = mq.matches)
    mq.addEventListener?.('change', update)
  }
  // Check reduced motion
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReduced.value = mq.matches
    const update = () => (prefersReduced.value = mq.matches)
    mq.addEventListener?.('change', update)
  }
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    ref="cardRef"
    class="tilt-card relative overflow-hidden rounded-2xl will-change-transform"
    :style="enabled ? { transform: cardTransform, transformStyle: 'preserve-3d' } : undefined"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >
    <slot />
    <!-- Glare overlay -->
    <div
      v-if="glare && enabled"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-15"
      :style="{ background: glareBackground }"
    />
  </div>
</template>
