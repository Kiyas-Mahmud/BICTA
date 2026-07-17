<script setup lang="ts">
import type { PrizeRow } from './PrizeEditor.vue'

export interface CompetitionFormData {
  eventId: number
  name: string
  slug: string
  type: string
  description: string
  rules: string
  registrationOpen: boolean
  registrationDeadline: string | null
  teamBased: boolean
  maxTeamSize: number
  coverImage: string | null
  sortOrder: number
  prizes: PrizeRow[]
}

const props = defineProps<{ initial?: Partial<CompetitionFormData>; eventId: number; saving?: boolean }>()
const emit = defineEmits<{ submit: [data: CompetitionFormData] }>()

const form = reactive<CompetitionFormData>({
  eventId: props.eventId,
  name: props.initial?.name ?? '',
  slug: props.initial?.slug ?? '',
  type: props.initial?.type ?? '',
  description: props.initial?.description ?? '',
  rules: props.initial?.rules ?? '',
  registrationOpen: props.initial?.registrationOpen ?? false,
  registrationDeadline: props.initial?.registrationDeadline ?? null,
  teamBased: props.initial?.teamBased ?? false,
  maxTeamSize: props.initial?.maxTeamSize ?? 1,
  coverImage: props.initial?.coverImage ?? null,
  sortOrder: props.initial?.sortOrder ?? 0,
  prizes: props.initial?.prizes ? props.initial.prizes.map((p) => ({ ...p })) : [],
})

function submit() {
  emit('submit', { ...form, prizes: form.prizes.filter((p) => p.position && p.amount) })
}
</script>

<template>
  <form class="max-w-2xl space-y-5" @submit.prevent="submit">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="label">Name</label>
        <input v-model="form.name" class="input" required maxlength="200" />
      </div>
      <div>
        <label class="label">Type <span class="text-ink-faint">(e.g. Hackathon)</span></label>
        <input v-model="form.type" class="input" maxlength="100" />
      </div>
      <div class="col-span-2">
        <label class="label">Slug <span class="text-ink-faint">(optional)</span></label>
        <input v-model="form.slug" class="input" maxlength="100" />
      </div>
      <div>
        <label class="label">Sort order</label>
        <input v-model.number="form.sortOrder" type="number" class="input" min="0" max="1000" />
      </div>
    </div>

    <div>
      <label class="label">Description</label>
      <AdminRichText v-model="form.description" />
    </div>
    <div>
      <label class="label">Rules</label>
      <AdminRichText v-model="form.rules" />
    </div>

    <fieldset class="rounded-2xl border border-line bg-mist-1 p-4">
      <legend class="px-1.5 text-sm font-bold text-ink">Registration</legend>
      <div class="grid grid-cols-2 gap-4">
        <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
          <span class="text-sm font-medium text-ink">Registration open</span>
          <span class="relative inline-flex shrink-0">
            <input v-model="form.registrationOpen" type="checkbox" class="peer sr-only" />
            <span class="block h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand-600" />
            <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
        <div>
          <label class="label">Deadline</label>
          <input v-model="form.registrationDeadline" type="date" class="input !bg-white" />
        </div>
        <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
          <span class="text-sm font-medium text-ink">Team-based</span>
          <span class="relative inline-flex shrink-0">
            <input v-model="form.teamBased" type="checkbox" class="peer sr-only" />
            <span class="block h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand-600" />
            <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
        <div v-if="form.teamBased">
          <label class="label">Max team size</label>
          <input v-model.number="form.maxTeamSize" type="number" class="input !bg-white" min="1" max="20" />
        </div>
      </div>
    </fieldset>

    <div>
      <label class="label">Prizes</label>
      <AdminPrizeEditor v-model="form.prizes" />
    </div>

    <div>
      <label class="label">Cover image</label>
      <AdminImageUploader v-model="form.coverImage" />
    </div>

    <button type="submit" class="btn-primary" :disabled="saving">
      {{ saving ? 'Saving…' : 'Save competition' }}
    </button>
  </form>
</template>
