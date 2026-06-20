<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: events } = await useFetch('/api/admin/events')
const eventId = ref<number | ''>('')

const { data: detail, refresh } = await useAsyncData(
  'gallery-event',
  () => (eventId.value ? $fetch(`/api/admin/events/${eventId.value}`) : Promise.resolve(null)),
  { watch: [eventId] },
)

const pendingUrl = ref<string | null>(null)
const caption = ref('')

async function add() {
  if (!pendingUrl.value || !eventId.value) return
  await $fetch('/api/admin/gallery', {
    method: 'POST',
    body: { eventId: eventId.value, url: pendingUrl.value, caption: caption.value || null },
  })
  pendingUrl.value = null
  caption.value = ''
  await refresh()
}

async function remove(id: number) {
  if (!window.confirm('Remove this photo?')) return
  await $fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Gallery</h1>

    <select v-model="eventId" class="input mt-4 max-w-xs">
      <option value="">Select event…</option>
      <option v-for="ev in events" :key="ev.id" :value="ev.id">{{ ev.title }} ({{ ev.year }})</option>
    </select>

    <div v-if="eventId" class="mt-6 rounded-xl border border-line bg-white p-6">
      <h2 class="text-sm font-semibold">Add photo</h2>
      <div class="mt-3 flex flex-wrap items-end gap-4">
        <AdminImageUploader v-model="pendingUrl" />
        <div class="min-w-[16rem] flex-1">
          <label class="label">Caption (optional)</label>
          <input v-model="caption" class="input" maxlength="300" />
        </div>
        <button class="btn-primary" :disabled="!pendingUrl" @click="add">Add to gallery</button>
      </div>
    </div>

    <div v-if="detail" class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div v-for="img in detail.gallery" :key="img.id" class="group relative overflow-hidden rounded-xl border border-line">
        <img :src="img.url" :alt="img.caption ?? ''" class="aspect-[4/3] w-full object-cover" />
        <p v-if="img.caption" class="truncate px-2 py-1.5 text-xs text-ink-soft">{{ img.caption }}</p>
        <button
          class="absolute right-2 top-2 hidden rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-red-600 shadow group-hover:block"
          @click="remove(img.id)"
        >
          Delete
        </button>
      </div>
      <p v-if="!detail.gallery?.length" class="col-span-full py-8 text-center text-ink-faint">No photos for this event yet.</p>
    </div>
  </div>
</template>
