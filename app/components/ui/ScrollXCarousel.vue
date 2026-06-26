<script setup lang="ts">
import { ref, computed } from 'vue'
import { useElementBounding } from '@vueuse/core'

const props = defineProps<{
  images: string[]
}>()

const containerRef = ref<HTMLElement | null>(null)

// useElementBounding tracks the position of the element relative to the viewport.
// When top === window.innerHeight, it's just appearing at the bottom.
// When bottom === 0, it's just disappearing at the top.
const { top, height } = useElementBounding(containerRef)

const progress = computed(() => {
  if (!import.meta.client) return 0
  
  const windowHeight = window.innerHeight
  const totalScrollDistance = windowHeight + height.value
  const currentScroll = windowHeight - top.value
  
  let p = currentScroll / totalScrollDistance
  // Clamp between 0 and 1
  p = Math.max(0, Math.min(1, p))
  return p
})

const transformTop = computed(() => {
  const start = 5
  const end = -60
  const current = start + (end - start) * progress.value
  return `translateX(${current}%)`
})

const transformBottom = computed(() => {
  const start = -70
  const end = 0
  const current = start + (end - start) * progress.value
  return `translateX(${current}%)`
})
</script>

<template>
  <div ref="containerRef" class="h-[110vh] w-full relative">
    <div class="h-screen relative place-content-center flex flex-col space-y-4 py-12 overflow-hidden sticky top-0">
      
      <!-- Gradient overlays to fade edges -->
      <div class="pointer-events-none w-[15vw] h-full absolute left-0 top-0 z-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
      <div class="pointer-events-none w-[15vw] h-full absolute right-0 top-0 z-10 bg-gradient-to-l from-white via-white/80 to-transparent" />
      
      <!-- Top row moving left -->
      <div
        class="relative flex space-x-4 will-change-transform"
        :style="{ transform: transformTop }"
      >
        <div
          v-for="(imageUrl, index) in images"
          :key="`top-${index}`"
          class="min-w-[42vw] aspect-video overflow-hidden shrink-0 first:ml-8 rounded-xl shadow-sm"
        >
          <img
            :src="imageUrl"
            alt="Gallery showcase"
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      <!-- Bottom row moving right -->
      <div
        class="relative flex space-x-4 will-change-transform"
        :style="{ transform: transformBottom }"
      >
        <div
          v-for="(imageUrl, index) in [...images].reverse()"
          :key="`bottom-${index}`"
          class="min-w-[42vw] aspect-video overflow-hidden shrink-0 first:ml-8 rounded-xl shadow-sm"
        >
          <img
            :src="imageUrl"
            alt="Gallery showcase"
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  </div>
</template>
