<script setup lang="ts">
defineProps<{
  images: string[]
}>()
</script>

<template>
  <div class="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 p-4">
    <div v-for="(img, idx) in images" :key="idx" class="break-inside-avoid overflow-hidden rounded-xl bg-mist-2">
      <img 
        :src="img" 
        alt="Gallery image"
        class="w-full h-auto object-cover transition-transform duration-500 hover:scale-[1.03]" 
        loading="lazy" 
      />
    </div>
  </div>
</template>
