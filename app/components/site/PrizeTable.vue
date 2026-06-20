<script setup lang="ts">
defineProps<{ prizes: { position: string; amount: string; note?: string | null }[] }>()
</script>

<template>
  <div class="glass-deep">
    <div class="relative divide-y divide-line/60">
      <div
        v-for="(p, i) in prizes"
        :key="i"
        class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-7 py-5"
      >
        <div class="min-w-0">
          <p class="font-bold">{{ p.position }}</p>
          <p v-if="p.note" class="mt-0.5 text-sm text-ink-soft">{{ p.note }}</p>
        </div>
        <p class="text-2xl font-extrabold tracking-tight">{{ p.amount }}</p>
      </div>
    </div>
  </div>
</template>
