<script setup lang="ts">
const props = defineProps<{ faqs: { id: number; question: string; answer: string }[] }>()
const open = ref<number | null>(props.faqs[0]?.id ?? null)
function toggle(id: number) { open.value = open.value === id ? null : id }
</script>

<template>
  <div class="w-full">
    <div v-for="f in faqs" :key="f.id" class="border-b border-line">
      <div class="flex">
        <button
          type="button"
          class="flex flex-1 items-center justify-between py-4 text-left font-semibold transition-all hover:underline [&[aria-expanded=true]>svg]:rotate-180"
          :aria-expanded="open === f.id"
          @click="toggle(f.id)"
        >
          {{ f.question }}
          <Icon
            name="lucide:chevron-down"
            class="h-4 w-4 shrink-0 opacity-60 transition-transform duration-200"
            aria-hidden="true"
          />
        </button>
      </div>
      <div class="faq-panel" :class="{ 'faq-open': open === f.id }">
        <div class="overflow-hidden">
          <div class="pb-4 pt-0 text-sm" v-html="f.answer" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms cubic-bezier(0.2, 0, 0, 1); }
.faq-open { grid-template-rows: 1fr; }
@media (prefers-reduced-motion: reduce) { .faq-panel { transition: none; } }
</style>
