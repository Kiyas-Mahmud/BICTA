<script setup lang="ts">
const images = [
  '/gallery-images/hackathons.jpg',
  '/gallery-images/images (1).jpg',
  '/gallery-images/images (2).jpg',
  '/gallery-images/images (3).jpg',
  '/gallery-images/images (4).jpg',
  '/gallery-images/images.jpg',
  '/gallery-images/photo-1624996752380-8ec242e0f85d.avif',
  '/gallery-images/photo-1688733720228-4f7a18681c4f.avif'
]

useSeoMeta({ title: 'Gallery', description: 'Moments from BICTA.' })
</script>

<template>
  <div>
    <section class="section pb-0 relative z-20 bg-white">
      <div class="container-site">
        <SiteBackButton to="/" label="Back to home" />
        <h1 class="text-display mt-6">Gallery</h1>
        <p class="mt-3 text-lg text-ink-soft">Moments from the festival.</p>
      </div>
    </section>

    <!-- Parallax Carousel Section -->
    <UiScrollXCarousel :images="images" class="mt-8" />
    
    <!-- Spacer at bottom to allow scrolling past the sticky container -->
    <div class="h-[20vh] bg-white relative z-20"></div>
  </div>
</template>
