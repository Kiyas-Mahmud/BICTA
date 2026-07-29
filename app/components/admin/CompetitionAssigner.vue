<script setup lang="ts">
// Grouped Event -> Competition checkbox picker, shared by judge and volunteer
// assignment. `singleEvent` enforces the volunteer rule (one event only) by
// clearing selections from other events as soon as one is picked.
const props = withDefaults(
  defineProps<{
    tree: { id: number; title: string; year: number; competitions: { id: number; name: string }[] }[]
    singleEvent?: boolean
  }>(),
  { singleEvent: false },
)

const model = defineModel<number[]>({ default: () => [] })

const eventOf = computed(() => {
  const map = new Map<number, number>()
  for (const e of props.tree) for (const c of e.competitions) map.set(c.id, e.id)
  return map
})

/** Event the current selection belongs to, when singleEvent is on. */
const lockedEventId = computed(() => {
  if (!props.singleEvent || !model.value.length) return null
  return eventOf.value.get(model.value[0]!) ?? null
})

function toggle(competitionId: number) {
  const next = new Set(model.value)
  if (next.has(competitionId)) {
    next.delete(competitionId)
  } else {
    // Switching to a different event replaces the selection rather than
    // silently mixing two events together.
    const targetEvent = eventOf.value.get(competitionId)
    if (props.singleEvent && lockedEventId.value !== null && targetEvent !== lockedEventId.value) {
      next.clear()
    }
    next.add(competitionId)
  }
  model.value = [...next]
}

function toggleEvent(e: { id: number; competitions: { id: number }[] }) {
  const ids = e.competitions.map((c) => c.id)
  const allOn = ids.every((id) => model.value.includes(id))
  if (allOn) {
    model.value = model.value.filter((id) => !ids.includes(id))
  } else {
    model.value = props.singleEvent ? [...ids] : [...new Set([...model.value, ...ids])]
  }
}

function isDisabled(competitionId: number) {
  if (!props.singleEvent || lockedEventId.value === null) return false
  return eventOf.value.get(competitionId) !== lockedEventId.value
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="e in tree" :key="e.id" class="surface-quiet overflow-hidden">
      <div class="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <p class="min-w-0 truncate text-sm font-bold text-ink">
          {{ e.title }} <span class="font-medium text-ink-faint">{{ e.year }}</span>
        </p>
        <button
          v-if="e.competitions.length"
          type="button"
          class="shrink-0 text-xs font-bold text-brand-700 transition-colors hover:text-brand-800"
          @click="toggleEvent(e)"
        >
          {{ e.competitions.every((c) => model.includes(c.id)) ? 'Clear' : 'Select all' }}
        </button>
      </div>

      <div v-if="e.competitions.length" class="grid gap-1.5 p-2.5 sm:grid-cols-2">
        <label
          v-for="c in e.competitions"
          :key="c.id"
          class="flex min-h-[2.5rem] cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors"
          :class="[
            model.includes(c.id) ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-soft hover:bg-white',
            isDisabled(c.id) ? 'cursor-not-allowed opacity-40' : '',
          ]"
        >
          <input
            type="checkbox"
            class="h-4 w-4 shrink-0 accent-brand-700"
            :checked="model.includes(c.id)"
            :disabled="isDisabled(c.id)"
            @change="toggle(c.id)"
          />
          <span class="truncate">{{ c.name }}</span>
        </label>
      </div>
      <p v-else class="px-3.5 py-3 text-xs text-ink-faint">No competitions in this event yet.</p>
    </div>

    <p v-if="singleEvent" class="text-xs text-ink-faint">
      A volunteer works one event. Picking a competition from another event replaces the current selection.
    </p>
  </div>
</template>
