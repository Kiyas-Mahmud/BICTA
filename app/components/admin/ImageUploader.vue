<script setup lang="ts">
const model = defineModel<string | null>({ default: null })

const uploading = ref(false)
const error = ref('')
const dragging = ref(false)

const ACCEPT = 'image/jpeg,image/png,image/webp,image/svg+xml'

async function upload(file: File) {
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
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await upload(file)
  input.value = ''
}

async function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!ACCEPT.split(',').includes(file.type)) {
    error.value = 'That file type is not supported. Use PNG, SVG, JPEG or WebP.'
    return
  }
  await upload(file)
}
</script>

<template>
  <div>
    <!-- filled state -->
    <div v-if="model" class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-mist-1 p-3">
      <img :src="model" alt="" class="h-16 w-24 shrink-0 rounded-lg border border-line bg-white object-contain p-1" />
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Icon name="lucide:circle-check-big" class="text-green-600" /> Image attached
        </p>
        <p class="mt-0.5 truncate text-xs text-ink-faint">{{ model }}</p>
        <div class="mt-2 flex items-center gap-3">
          <label class="cursor-pointer text-xs font-bold text-brand-700 transition-colors hover:text-brand-800">
            <input type="file" :accept="ACCEPT" class="sr-only" @change="onFile" />
            {{ uploading ? 'Uploading…' : 'Replace' }}
          </label>
          <button type="button" class="text-xs font-bold text-red-600 transition-colors hover:text-red-700" @click="model = null">
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- empty state: click or drop -->
    <label
      v-else
      class="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-200"
      :class="dragging ? 'border-brand-500 bg-brand-50' : 'border-line bg-mist-1 hover:border-brand-300 hover:bg-brand-50/50'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input type="file" :accept="ACCEPT" class="sr-only" @change="onFile" />
      <span
        class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl text-brand-700 ring-1 ring-inset ring-line"
      >
        <Icon :name="uploading ? 'lucide:loader-2' : 'lucide:upload-cloud'" :class="{ 'animate-spin': uploading }" />
      </span>
      <span class="mt-1 text-sm font-bold text-ink">
        {{ uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Click to upload or drop an image' }}
      </span>
      <span class="text-xs text-ink-faint">PNG, SVG, JPEG or WebP · max 5 MB</span>
    </label>

    <p v-if="error" class="form-error mt-2" role="alert">{{ error }}</p>
  </div>
</template>
