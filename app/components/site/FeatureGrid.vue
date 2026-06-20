<script setup lang="ts">
defineProps<{ features: { id: number; title: string; body: string; icon?: string | null }[] }>()

const tiles = ['tile-blue', 'tile-purple', 'tile-green', 'tile-orange', 'tile-pink', 'tile-cyan']
function iconName(icon?: string | null) {
  if (!icon) return 'lucide:sparkles'
  return icon.includes(':') ? icon : `lucide:${icon}`
}
</script>

<template>
  <div class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))">
    <div
      v-for="(f, i) in features"
      :key="f.id"
      class="card card-hover flex flex-col items-center p-6 text-center"
    >
      <span class="tile" :class="tiles[i % tiles.length]">
        <Icon :name="iconName(f.icon)" />
      </span>
      <h3 class="mt-4 font-extrabold tracking-tight">{{ f.title }}</h3>
      <p class="mt-2 text-sm leading-relaxed text-ink-soft">{{ f.body }}</p>
    </div>
  </div>
</template>
