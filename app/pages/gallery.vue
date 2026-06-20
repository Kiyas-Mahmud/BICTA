<script setup lang="ts">
// Gallery page = current event's photos (same source as the home gallery section).
const { data } = await useFetch('/api/public/home', { key: 'home-gallery' })
const gallery = computed(() => data.value?.gallery ?? [])

useSeoMeta({ title: 'Gallery', description: 'Moments from BICTA.' })
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <h1 class="text-display mt-6">Gallery</h1>
    <p class="mt-3 text-lg text-ink-soft">Moments from the festival.</p>

    <div v-if="gallery.length" class="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <figure v-for="img in gallery" :key="img.id" class="img-zoom group card overflow-hidden">
        <img :src="img.url" :alt="img.caption ?? 'Event photo'" loading="lazy" class="aspect-[4/3] w-full object-cover" />
        <figcaption v-if="img.caption" class="px-3 py-2 text-xs text-ink-soft">{{ img.caption }}</figcaption>
      </figure>
    </div>
    <div v-else class="mt-16 rounded-2xl border border-dashed border-line py-16 text-center text-ink-faint">
      No photos yet. Check back after the event.
    </div>
  </section>
</template>
