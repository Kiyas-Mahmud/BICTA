<script setup lang="ts">
// Shared shell for the portal auth pages (login/forgot/reset/set-password).
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
    <div class="hero-field" aria-hidden="true">
      <div class="float-blob float-blob-1" />
      <div class="float-blob float-blob-2" />
    </div>
    <div class="rise card w-full max-w-md p-8 shadow-soft sm:p-10">
      <span class="tile tile-blue mb-5 h-12 w-12"><Icon name="lucide:qr-code" /></span>
      <h1 class="text-2xl font-extrabold tracking-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 text-sm text-ink-soft">{{ subtitle }}</p>
      <div class="mt-6">
        <slot />
      </div>
    </div>
  </div>
</template>
