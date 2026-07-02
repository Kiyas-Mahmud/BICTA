<script setup lang="ts">
// Local shape (matches what SitePersonCard needs); no server-schema import in
// client code.
export interface MarqueePerson {
  id: number
  name: string
  title: string
  organization: string
  photoUrl?: string | null
  bio: string
  socialUrl?: string | null
}

const props = defineProps<{ people: MarqueePerson[] }>()

// Three identical copies → seamless loop (translate one copy width = -33.333%).
const copies = 3
// Slower for short lists, never too fast.
const duration = computed(() => `${Math.max(18, props.people.length * 6)}s`)
</script>

<template>
  <div class="marquee" :style="{ '--marquee-duration': duration }">
    <div class="marquee-track">
      <div
        v-for="(p, i) in Array.from({ length: copies }).flatMap(() => people)"
        :key="i"
        class="w-64 shrink-0"
        :aria-hidden="i >= people.length ? 'true' : undefined"
      >
        <SitePersonCard :person="p" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}
.marquee-track {
  display: flex;
  gap: 1.25rem;
  width: max-content;
  animation: marquee var(--marquee-duration, 30s) linear infinite;
}
.marquee:hover .marquee-track {
  animation-play-state: paused;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-100% / 3)); }
}
@media (prefers-reduced-motion: reduce) {
  .marquee {
    overflow-x: auto;
    -webkit-mask-image: none;
    mask-image: none;
  }
  .marquee-track {
    animation: none;
  }
}
</style>
