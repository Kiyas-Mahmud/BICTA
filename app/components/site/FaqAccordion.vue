<script setup lang="ts">
const props = defineProps<{ faqs: { id: number; question: string; answer: string }[] }>()
const open = ref<number | null>(props.faqs[0]?.id ?? null)
function toggle(id: number) { open.value = open.value === id ? null : id }
</script>

<template>
  <div class="space-y-3">
    <div v-for="f in faqs" :key="f.id" class="card overflow-hidden">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        :aria-expanded="open === f.id"
        @click="toggle(f.id)"
      >
        <span class="font-bold tracking-tight">{{ f.question }}</span>
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform duration-300 ease-out-quart"
          :class="{ 'rotate-45': open === f.id }"
        >
          <Icon name="lucide:plus" />
        </span>
      </button>
      <div class="faq-panel" :class="{ 'faq-open': open === f.id }">
        <div class="overflow-hidden">
          <!-- eslint-disable-next-line vue/no-v-html — sanitized server-side on write -->
          <div class="prose-site px-5 pb-5 text-sm" v-html="f.answer" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1); }
.faq-open { grid-template-rows: 1fr; }
@media (prefers-reduced-motion: reduce) { .faq-panel { transition: none; } }
</style>
