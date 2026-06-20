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

    <fieldset class="rounded-xl border border-line p-4">
      <legend class="px-1 text-sm font-semibold">Registration</legend>
      <div class="grid grid-cols-2 gap-4">
        <label class="flex items-center gap-2 text-sm font-medium">
          <input v-model="form.registrationOpen" type="checkbox" class="h-4 w-4 accent-accent" />
          Registration open
        </label>
        <div>
          <label class="label">Deadline</label>
          <input v-model="form.registrationDeadline" type="date" class="input" />
        </div>
        <label class="flex items-center gap-2 text-sm font-medium">
          <input v-model="form.teamBased" type="checkbox" class="h-4 w-4 accent-accent" />
          Team-based
        </label>
        <div v-if="form.teamBased">
          <label class="label">Max team size</label>
          <input v-model.number="form.maxTeamSize" type="number" class="input" min="1" max="20" />
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
