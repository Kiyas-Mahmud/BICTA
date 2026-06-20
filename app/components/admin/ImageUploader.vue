<script setup lang="ts">
const model = defineModel<string | null>({ default: null })

const uploading = ref(false)
const error = ref('')
const inputEl = ref<HTMLInputElement>()

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', body: form })
    model.value = res.url
  } catch (err: any) {
    error.value = err?.data?.statusMessage ?? 'Upload failed'
  } finally {
    uploading.value = false
    if (inputEl.value) inputEl.value.value = ''
  }
}
</script>

<template>
  <div>
    <div v-if="model" class="mb-2 flex items-start gap-3">
      <img :src="model" alt="" class="h-24 w-36 rounded-lg border border-line bg-white object-contain p-1" />
      <button type="button" class="text-sm font-medium text-red-600 hover:text-red-700" @click="model = null">
        Remove
      </button>
    </div>
    <label class="btn-ghost cursor-pointer">
      <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="onFile" />
      {{ uploading ? 'Uploading…' : model ? 'Replace image' : 'Upload image' }}
    </label>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p class="mt-1 text-xs text-ink-faint">PNG, SVG, JPEG or WebP, max 5 MB. SVG or transparent PNG works best for logos.</p>
  </div>
</template>
