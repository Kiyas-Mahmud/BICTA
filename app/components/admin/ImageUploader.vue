<script setup lang="ts">
const model = defineModel<string | null>({ default: null })

const uploading = ref(false)
const error = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
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
    input.value = ''
  }
}
</script>

<template>
  <div>
    <!-- filled state -->
    <div v-if="model" class="flex items-center gap-3 rounded-xl border border-line bg-mist-1 p-2.5">
      <img :src="model" alt="" class="h-16 w-24 shrink-0 rounded-lg border border-line bg-white object-contain p-1" />
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-1.5 text-sm font-semibold text-ink"><Icon name="lucide:check-circle" class="text-green-600" /> Image attached</p>
        <div class="mt-1.5 flex items-center gap-3">
          <label class="cursor-pointer text-xs font-bold text-brand-700 hover:text-brand-800">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="onFile" />
            {{ uploading ? 'Uploading…' : 'Replace' }}
          </label>
          <button type="button" class="text-xs font-bold text-red-600 hover:text-red-700" @click="model = null">Remove</button>
        </div>
      </div>
    </div>

    <!-- empty state -->
    <label v-else class="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-mist-1 px-4 py-7 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/50">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="onFile" />
      <Icon :name="uploading ? 'lucide:loader-2' : 'lucide:upload-cloud'" class="text-2xl text-ink-faint" :class="{ 'animate-spin': uploading }" />
      <p class="text-sm font-semibold text-ink">{{ uploading ? 'Uploading…' : 'Click to upload image' }}</p>
      <p class="text-xs text-ink-faint">PNG, SVG, JPEG or WebP · max 5 MB</p>
    </label>

    <p v-if="error" class="mt-1.5 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
