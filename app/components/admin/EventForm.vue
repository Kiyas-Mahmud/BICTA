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

// Surfaced inline so a bad range is caught before the server rejects it.
const dateWarning = computed(() =>
  form.startDate && form.endDate && form.endDate < form.startDate ? 'End date is before the start date.' : '',
)
</script>

<template>
  <form class="space-y-6" @submit.prevent="emit('submit', { ...form })">
    <AdminFormSection title="Basics" description="How this edition is named and listed." icon="lucide:calendar-days">
      <div>
        <label class="label" for="ev-title">Title <span class="text-red-600">*</span></label>
        <input id="ev-title" v-model="form.title" class="input" required maxlength="200" placeholder="BICTA 2026" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-year">Year <span class="text-red-600">*</span></label>
          <input id="ev-year" v-model.number="form.year" type="number" class="input" required min="2000" max="2100" />
        </div>
        <div>
          <label class="label" for="ev-status">Status</label>
          <select id="ev-status" v-model="form.status" class="input">
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label" for="ev-slug">Slug <span class="font-normal text-ink-faint">(optional — generated from the title)</span></label>
        <input id="ev-slug" v-model="form.slug" class="input font-mono" maxlength="100" placeholder="bicta-2026" />
      </div>
    </AdminFormSection>

    <AdminFormSection title="Schedule & venue" description="Dates power the public countdown and timeline." icon="lucide:map-pin">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="ev-start">Start date</label>
          <input id="ev-start" v-model="form.startDate" type="date" class="input" />
        </div>
        <div>
          <label class="label" for="ev-end">End date</label>
          <input id="ev-end" v-model="form.endDate" type="date" class="input" :aria-invalid="Boolean(dateWarning)" />
        </div>
      </div>
      <p v-if="dateWarning" class="form-error" role="alert">{{ dateWarning }}</p>
      <div>
        <label class="label" for="ev-venue">Venue</label>
        <input id="ev-venue" v-model="form.venue" class="input" maxlength="200" placeholder="Main auditorium, City Campus" />
      </div>
    </AdminFormSection>

    <AdminFormSection title="Description" description="Shown on the public event page." icon="lucide:text">
      <AdminRichText v-model="form.description" />
    </AdminFormSection>

    <AdminFormSection title="Hero image" description="Wide banner at the top of the event page." icon="lucide:image">
      <AdminImageUploader v-model="form.heroImage" />
    </AdminFormSection>

    <AdminFormActions :saving="saving" label="Save event" hint="Changes go live on the public site immediately." />
  </form>
</template>
