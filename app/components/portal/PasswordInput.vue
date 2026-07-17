<script setup lang="ts">
// Password field with a show/hide toggle. v-model compatible.
const model = defineModel<string>({ default: '' })
withDefaults(defineProps<{ id?: string; autocomplete?: string; placeholder?: string }>(), {
  autocomplete: 'current-password',
  placeholder: '',
})
const show = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :type="show ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      required
      class="field !pr-11"
    />
    <button
      type="button"
      class="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-mist-2 hover:text-ink"
      :aria-label="show ? 'Hide password' : 'Show password'"
      tabindex="-1"
      @click="show = !show"
    >
      <Icon :name="show ? 'lucide:eye-off' : 'lucide:eye'" />
    </button>
  </div>
</template>
