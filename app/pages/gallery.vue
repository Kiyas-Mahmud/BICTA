<script setup lang="ts">
// Gallery = current event's photos from the admin DB (same source as home).
const { data } = await useFetch('/api/public/home', { key: 'home' })
const images = computed(() => (data.value?.gallery ?? []).map((g: any) => g.url))

useSeoMeta({ title: 'Gallery', description: 'Moments from BICTA.' })
</script>

<template>
  <section class="container-site section">
    <SiteBackButton to="/" label="Back to home" />
    <h1 class="text-display mt-6">Gallery</h1>
    <p class="mt-3 text-lg text-ink-soft">Moments from the festival.</p>

    <UiImageGallery v-if="images.length" class="mt-8" :images="images" />
    <div v-else class="mt-16 rounded-2xl border border-dashed border-line py-16 text-center text-ink-faint">
      No photos yet. Check back after the event.
    </div>
  </section>
</template>
