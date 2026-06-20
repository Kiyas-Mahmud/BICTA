<script setup lang="ts">
defineProps<{ name?: string; address?: string; directions?: string; mapEmbed?: string }>()
</script>

<template>
  <div class="card overflow-hidden">
    <div v-if="mapEmbed" class="aspect-[16/10] w-full bg-mist-2">
      <iframe
        :src="mapEmbed"
        class="h-full w-full"
        style="border: 0"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Venue location map"
      />
    </div>
    <div class="flex items-start gap-3 p-6">
      <span class="tile tile-blue h-11 w-11 shrink-0 text-xl"><Icon name="lucide:map-pin" /></span>
      <div>
        <h3 v-if="name" class="font-extrabold tracking-tight">{{ name }}</h3>
        <p v-if="address" class="mt-0.5 text-sm text-ink-soft">{{ address }}</p>
        <p v-if="directions" class="mt-2 text-sm text-ink-soft">{{ directions }}</p>
      </div>
    </div>
  </div>
</template>
