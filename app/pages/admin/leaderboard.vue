<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

// Event -> Competition, same cascading pattern as the Registrations page.
const eventId = ref<number | ''>('')
const competitionId = ref<number | ''>('')

const { data: tree } = await useFetch('/api/admin/event-tree', { key: 'admin-event-tree' })

const competitionOptions = computed(() => {
  const events = tree.value ?? []
  if (!eventId.value) return events.flatMap((e) => e.competitions.map((c) => ({ ...c, eventTitle: e.title })))
  return (events.find((e) => e.id === eventId.value)?.competitions ?? []).map((c) => ({ ...c, eventTitle: '' }))
})

// Changing the event invalidates a competition that no longer belongs to it,
// then falls back to the first competition in the newly chosen event.
watch(eventId, () => {
  if (!competitionOptions.value.some((c) => c.id === competitionId.value)) {
    competitionId.value = competitionOptions.value[0]?.id ?? ''
  }
})
// Once competitions load for the first time, default to the first one.
watch(competitionOptions, (opts) => {
  if (!competitionId.value && opts.length) competitionId.value = opts[0]!.id
}, { immediate: true })

const board = ref<any>(null)
const pending = ref(false)
async function refreshBoard() {
  if (!competitionId.value) {
    board.value = null
    return
  }
  pending.value = true
  try {
    board.value = await $fetch(`/api/admin/competitions/${competitionId.value}/leaderboard`)
  } finally {
    pending.value = false
  }
}
watch(competitionId, refreshBoard, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Leaderboard" subtitle="Live standings for any event and competition." icon="lucide:trophy" />

    <div class="toolbar fade-up stagger-1">
      <div class="select-wrap">
        <Icon name="lucide:calendar-days" />
        <label class="sr-only" for="lb-event">Event</label>
        <select id="lb-event" v-model="eventId" class="input w-full sm:w-52">
          <option value="">All events</option>
          <option v-for="e in tree ?? []" :key="e.id" :value="e.id">{{ e.title }} ({{ e.year }})</option>
        </select>
      </div>

      <div class="select-wrap">
        <Icon name="lucide:trophy" />
        <label class="sr-only" for="lb-comp">Competition</label>
        <select id="lb-comp" v-model="competitionId" class="input w-full sm:w-52" :disabled="!competitionOptions.length">
          <option v-if="!competitionOptions.length" value="">No competitions</option>
          <option v-for="c in competitionOptions" :key="c.id" :value="c.id">
            {{ c.name }}<template v-if="c.eventTitle"> · {{ c.eventTitle }}</template>
          </option>
        </select>
      </div>
    </div>

    <section class="surface fade-up stagger-2 overflow-hidden">
      <AdminEmptyState
        v-if="!competitionOptions.length"
        icon="lucide:trophy"
        title="No competitions yet"
        body="Create an event and a competition first — standings appear once teams are confirmed and judges start scoring."
      />
      <AdminLeaderboard v-else :board="board" :pending="pending" />
    </section>
  </div>
</template>
