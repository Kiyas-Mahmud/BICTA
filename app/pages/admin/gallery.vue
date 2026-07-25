<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: events } = await useFetch('/api/admin/events')
const eventId = ref<number | ''>('')

const { data: detail, refresh, pending } = await useAsyncData(
  'gallery-event',
  () => (eventId.value ? $fetch(`/api/admin/events/${eventId.value}`) : Promise.resolve(null)),
  { watch: [eventId] },
)

const pendingUrl = ref<string | null>(null)
const caption = ref('')
const adding = ref(false)
const toast = useToast()
const { confirm } = useConfirm()

async function add() {
  if (!pendingUrl.value || !eventId.value) return
  adding.value = true
  try {
    await $fetch('/api/admin/gallery', {
      method: 'POST',
      body: { eventId: eventId.value, url: pendingUrl.value, caption: caption.value || null },
    })
    pendingUrl.value = null
    caption.value = ''
    await refresh()
    toast.success('Photo added to the gallery')
  } catch (e: any) {
    toast.error('Could not add that photo', e?.data?.statusMessage ?? 'Try uploading it again.')
  } finally {
    adding.value = false
  }
}

async function remove(id: number) {
  const ok = await confirm({
    title: 'Remove this photo?',
    body: 'It disappears from the public gallery straight away.',
    confirmLabel: 'Remove photo',
  })
  if (!ok) return
  await $fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
  await refresh()
  toast.success('Photo removed')
}

const selectedEvent = computed(() => events.value?.find((e: any) => e.id === eventId.value))
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Gallery" subtitle="Event photos shown in the public gallery section." icon="lucide:images">
      <template #actions>
        <div class="select-wrap">
          <Icon name="lucide:calendar-days" />
          <label class="sr-only" for="gal-event">Event</label>
          <select id="gal-event" v-model="eventId" class="input w-full sm:w-64">
            <option value="">Select event…</option>
            <option v-for="ev in events" :key="ev.id" :value="ev.id">{{ ev.title }} ({{ ev.year }})</option>
          </select>
        </div>
      </template>
    </AdminPageHeader>

    <!-- no event picked yet -->
    <section v-if="!eventId" class="surface fade-up stagger-1">
      <AdminEmptyState icon="lucide:image" title="Pick an event" body="Choose an edition above to manage its photos. Each event keeps its own gallery." />
    </section>

    <template v-else>
      <AdminPanel title="Add photo" :subtitle="selectedEvent ? `Uploading to ${selectedEvent.title}` : undefined" icon="lucide:image-plus" class="fade-up stagger-1">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <AdminImageUploader v-model="pendingUrl" />
          <div class="flex flex-col justify-between gap-4">
            <div>
              <label class="label" for="gal-caption">Caption <span class="font-normal text-ink-faint">(optional)</span></label>
              <input id="gal-caption" v-model="caption" class="input" maxlength="300" placeholder="Team Quantum presenting on demo day" />
              <p class="mt-1.5 text-xs text-ink-faint">Captions show under the photo in the public lightbox.</p>
            </div>
            <button class="btn-primary self-start !py-2.5" :disabled="!pendingUrl || adding" @click="add">
              <Icon :name="adding ? 'lucide:loader-2' : 'lucide:plus'" :class="{ 'animate-spin': adding }" />
              {{ adding ? 'Adding…' : 'Add to gallery' }}
            </button>
          </div>
        </div>
      </AdminPanel>

      <section class="fade-up stagger-2">
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <h2 class="console-h2">Photos</h2>
          <span class="text-xs font-semibold text-ink-faint">{{ detail?.gallery?.length ?? 0 }} in this event</span>
        </div>

        <div v-if="pending" class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <span v-for="i in 4" :key="i" class="skel aspect-[4/3] w-full rounded-2xl" />
        </div>

        <div v-else-if="detail?.gallery?.length" class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <figure
            v-for="img in detail.gallery"
            :key="img.id"
            class="surface group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div class="overflow-hidden">
              <img :src="img.url" :alt="img.caption ?? ''" loading="lazy" class="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-liquid group-hover:scale-105" />
            </div>
            <figcaption v-if="img.caption" class="truncate px-3 py-2.5 text-xs text-ink-soft">{{ img.caption }}</figcaption>
            <button
              class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink-faint shadow-soft backdrop-blur transition-all duration-200 hover:text-red-600 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              :aria-label="img.caption ? `Delete photo: ${img.caption}` : 'Delete photo'"
              @click="remove(img.id)"
            >
              <Icon name="lucide:trash-2" />
            </button>
          </figure>
        </div>

        <div v-else class="surface">
          <AdminEmptyState icon="lucide:images" title="No photos for this event yet" body="Upload the first one above — photos appear in the public gallery in the order they are added." />
        </div>
      </section>
    </template>
  </div>
</template>
