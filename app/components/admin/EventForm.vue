<script setup lang="ts">
export interface EventFormData {
  title: string
  year: number
  slug: string
  description: string
  startDate: string | null
  endDate: string | null
  venue: string | null
  heroImage: string | null
  status: 'upcoming' | 'ongoing' | 'past'
}

const props = defineProps<{ initial?: Partial<EventFormData>; saving?: boolean }>()
const emit = defineEmits<{ submit: [data: EventFormData] }>()

const form = reactive<EventFormData>({
  title: props.initial?.title ?? '',
  year: props.initial?.year ?? new Date().getFullYear(),
  slug: props.initial?.slug ?? '',
  description: props.initial?.description ?? '',
  startDate: props.initial?.startDate ?? null,
  endDate: props.initial?.endDate ?? null,
  venue: props.initial?.venue ?? null,
  heroImage: props.initial?.heroImage ?? null,
  status: props.initial?.status ?? 'upcoming',
})
</script>

<template>
  <form class="max-w-2xl space-y-5" @submit.prevent="emit('submit', { ...form })">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="label">Title</label>
        <input v-model="form.title" class="input" required maxlength="200" />
      </div>
      <div>
        <label class="label">Year</label>
        <input v-model.number="form.year" type="number" class="input" required min="2000" max="2100" />
      </div>
      <div>
        <label class="label">Status</label>
        <select v-model="form.status" class="input">
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="past">Past</option>
        </select>
      </div>
      <div>
        <label class="label">Start date</label>
        <input v-model="form.startDate" type="date" class="input" />
      </div>
      <div>
        <label class="label">End date</label>
        <input v-model="form.endDate" type="date" class="input" />
      </div>
      <div class="col-span-2">
        <label class="label">Venue</label>
        <input v-model="form.venue" class="input" maxlength="200" />
      </div>
      <div class="col-span-2">
        <label class="label">Slug <span class="text-ink-faint">(optional — generated from title)</span></label>
        <input v-model="form.slug" class="input" maxlength="100" />
      </div>
    </div>

    <div>
      <label class="label">Description</label>
      <AdminRichText v-model="form.description" />
    </div>

    <div>
      <label class="label">Hero image</label>
      <AdminImageUploader v-model="form.heroImage" />
    </div>

    <button type="submit" class="btn-primary" :disabled="saving">
      {{ saving ? 'Saving…' : 'Save event' }}
    </button>
  </form>
</template>
