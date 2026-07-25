<script setup lang="ts">
// Initials chip used in every people-shaped table row.
const props = withDefaults(
  defineProps<{ name?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg' }>(),
  { size: 'md' },
)

const sizes = { sm: 'h-8 w-8 text-[0.65rem]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-base' }
const label = computed(() => initialsOf(props.name))
</script>

<template>
  <img
    v-if="src"
    :src="src"
    alt=""
    class="shrink-0 rounded-full border border-line object-cover"
    :class="sizes[size]"
  />
  <span
    v-else
    class="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 ring-1 ring-inset ring-brand-200"
    :class="sizes[size]"
    aria-hidden="true"
  >{{ label }}</span>
</template>
