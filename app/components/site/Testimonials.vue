<script setup lang="ts">
// DB-backed testimonials (admin > Testimonials). Page provides the section
// wrapper + heading; this renders the masonry grid only.
export interface TestimonialItem {
  id: number
  name: string
  role: string
  quote: string
  photoUrl?: string | null
}

defineProps<{ items: TestimonialItem[] }>()
</script>

<template>
  <div class="columns-1 gap-5 space-y-5 md:columns-2 lg:columns-3">
    <figure
      v-for="item in items"
      :key="item.id"
      class="card break-inside-avoid p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <figcaption class="mb-4 flex items-center gap-4">
        <img
          v-if="item.photoUrl"
          :src="item.photoUrl"
          :alt="item.name"
          loading="lazy"
          class="h-12 w-12 rounded-full object-cover ring-4 ring-mist-1"
        />
        <span v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 font-extrabold text-brand-600 ring-4 ring-mist-1">
          {{ item.name.charAt(0) }}
        </span>
        <div>
          <p class="font-bold text-ink">{{ item.name }}</p>
          <p v-if="item.role" class="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-600">{{ item.role }}</p>
        </div>
      </figcaption>
      <blockquote class="text-sm leading-relaxed text-ink-soft">"{{ item.quote }}"</blockquote>
    </figure>
  </div>
</template>
