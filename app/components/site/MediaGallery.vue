<script setup lang="ts">
const props = defineProps<{ images: { id: number; url: string; caption?: string | null }[] }>()

const tabs = ['All', 'Photos'] as const
const active = ref<(typeof tabs)[number]>('Photos')

const featured = computed(() => props.images[0])
const rest = computed(() => props.images.slice(1, 5))
</script>

<template>
  <div>
    <div class="flex justify-center gap-2">
      <button
        v-for="t in tabs"
        :key="t"
        class="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
        :class="active === t ? 'bg-brand-600 text-white' : 'bg-mist-1 text-ink-soft hover:bg-mist-2'"
        @click="active = t"
      >
        {{ t }}
      </button>
    </div>

    <div class="mt-8 grid gap-4 lg:grid-cols-2">
      <figure v-if="featured" class="img-zoom group card overflow-hidden">
        <img :src="featured.url" :alt="featured.caption ?? 'Event photo'" loading="lazy" class="aspect-[16/10] w-full object-cover" />
      </figure>
      <div class="grid grid-cols-2 gap-4">
        <figure v-for="img in rest" :key="img.id" class="img-zoom group card overflow-hidden">
          <img :src="img.url" :alt="img.caption ?? 'Event photo'" loading="lazy" class="aspect-[4/3] h-full w-full object-cover" />
        </figure>
      </div>
    </div>
  </div>
</template>
