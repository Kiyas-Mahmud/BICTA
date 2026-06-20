<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>()
const title = computed(() => (props.error.statusCode === 404 ? 'Page not found' : 'Something went wrong'))
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 text-center font-sans text-ink antialiased">
    <div class="hero-field" aria-hidden="true">
      <div class="float-blob float-blob-1" />
      <div class="float-blob float-blob-2" />
    </div>
    <div class="card max-w-md p-10 shadow-soft sm:p-12">
      <p class="text-7xl font-extrabold tracking-tight text-brand-600">{{ error.statusCode }}</p>
      <h1 class="mt-4 text-2xl font-extrabold tracking-tight">{{ title }}</h1>
      <p class="mt-3 text-ink-soft">The page you're looking for doesn't exist or has moved.</p>
      <button class="btn-primary mt-8" @click="clearError({ redirect: '/' })">
        <Icon name="lucide:arrow-left" /> Back to home
      </button>
    </div>
  </div>
</template>
