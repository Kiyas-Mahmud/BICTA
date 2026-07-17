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
    <div class="admin-head">
      <div>
        <h1 class="admin-h1">Gallery</h1>
        <p class="admin-sub">Event photos shown in the public gallery section.</p>
      </div>
    </div>

    <div class="relative mt-5 max-w-xs">
      <Icon name="lucide:calendar-days" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <select v-model="eventId" class="input !pl-9">
        <option value="">Select event…</option>
        <option v-for="ev in events" :key="ev.id" :value="ev.id">{{ ev.title }} ({{ ev.year }})</option>
      </select>
    </div>

    <div v-if="eventId" class="admin-panel mt-6">
      <div class="mb-4 flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon name="lucide:image-plus" /></span>
        <h2 class="text-sm font-bold text-ink">Add photo</h2>
      </div>
      <div class="flex flex-wrap items-end gap-4">
        <AdminImageUploader v-model="pendingUrl" />
        <div class="min-w-[16rem] flex-1">
          <label class="label">Caption (optional)</label>
          <input v-model="caption" class="input" maxlength="300" />
        </div>
        <button class="btn-primary" :disabled="!pendingUrl" @click="add"><Icon name="lucide:plus" /> Add to gallery</button>
      </div>
    </div>

    <div v-if="detail" class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div v-for="img in detail.gallery" :key="img.id" class="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div class="overflow-hidden">
          <img :src="img.url" :alt="img.caption ?? ''" class="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
        <p v-if="img.caption" class="truncate px-3 py-2 text-xs text-ink-soft">{{ img.caption }}</p>
        <button
          class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink-faint opacity-0 shadow-soft backdrop-blur transition-all hover:text-red-600 group-hover:opacity-100"
          aria-label="Delete" @click="remove(img.id)"
        >
          <Icon name="lucide:trash-2" />
        </button>
      </div>
      <div v-if="!detail.gallery?.length" class="col-span-full py-12 text-center">
        <div class="flex flex-col items-center gap-2 text-ink-faint">
          <Icon name="lucide:images" class="text-3xl" />
          <p class="text-sm">No photos for this event yet.</p>
        </div>
      </div>
    </div>

    <div v-else-if="!eventId" class="mt-8 flex flex-col items-center gap-2 py-12 text-center text-ink-faint">
      <Icon name="lucide:image" class="text-3xl" />
      <p class="text-sm">Pick an event to manage its photos.</p>
    </div>
  </div>
</template>
