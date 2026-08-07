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
  startsAt: string | null
  endsAt: string | null
  judgingOpen: boolean
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
  // datetime-local wants 'YYYY-MM-DDTHH:mm'; the API stores full ISO UTC.
  startsAt: toLocalInput(props.initial?.startsAt),
  endsAt: toLocalInput(props.initial?.endsAt),
  judgingOpen: props.initial?.judgingOpen ?? true,
  teamBased: props.initial?.teamBased ?? false,
  maxTeamSize: props.initial?.maxTeamSize ?? 1,
  coverImage: props.initial?.coverImage ?? null,
  sortOrder: props.initial?.sortOrder ?? 0,
  prizes: props.initial?.prizes ? props.initial.prizes.map((p) => ({ ...p })) : [],
})

// The competition window is stored as full ISO UTC, but <input
// type="datetime-local"> only speaks naive local time. Converting at the two
// edges keeps the stored value unambiguous — the scanner compares in UTC, so a
// timezone-less string here would silently shift the window.
function toLocalInput(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function toIso(local?: string | null): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function submit() {
  emit('submit', {
    ...form,
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
    prizes: form.prizes.filter((p) => p.position && p.amount),
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <AdminFormSection title="Basics" description="Name, kind of contest and ordering on the public page." icon="lucide:trophy">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="cp-name">Name <span class="text-red-600">*</span></label>
          <input id="cp-name" v-model="form.name" class="input" required maxlength="200" placeholder="Hackathon" />
        </div>
        <div>
          <label class="label" for="cp-type">Type <span class="font-normal text-ink-faint">(e.g. Hackathon)</span></label>
          <input id="cp-type" v-model="form.type" class="input" maxlength="100" />
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="cp-slug">Slug <span class="font-normal text-ink-faint">(optional)</span></label>
          <input id="cp-slug" v-model="form.slug" class="input font-mono" maxlength="100" />
        </div>
        <div>
          <label class="label" for="cp-sort">Sort order</label>
          <input id="cp-sort" v-model.number="form.sortOrder" type="number" class="input" min="0" max="1000" />
        </div>
      </div>
    </AdminFormSection>

    <AdminFormSection title="Registration" description="Controls whether the public form accepts entries." icon="lucide:clipboard-list">
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminSwitch v-model="form.registrationOpen" label="Registration open" hint="Sign-ups are refused when off." />
        <div>
          <label class="label" for="cp-deadline">Deadline</label>
          <input id="cp-deadline" v-model="form.registrationDeadline" type="date" class="input" />
        </div>
        <div>
          <label class="label" for="cp-starts">Competition starts</label>
          <input id="cp-starts" v-model="form.startsAt" type="datetime-local" class="input" />
          <p class="mt-1.5 text-xs text-ink-faint">QR scans are refused before this. Blank falls back to the event dates.</p>
        </div>
        <div>
          <label class="label" for="cp-ends">Competition ends</label>
          <input id="cp-ends" v-model="form.endsAt" type="datetime-local" class="input" />
          <p class="mt-1.5 text-xs text-ink-faint">Kit and food scans stop working after this.</p>
        </div>
        <AdminSwitch v-model="form.teamBased" label="Team-based" hint="Adds the team roster to the form." />
        <div v-if="form.teamBased">
          <label class="label" for="cp-team">Max team size</label>
          <input id="cp-team" v-model.number="form.maxTeamSize" type="number" class="input" min="1" max="20" />
        </div>
      </div>
      <p class="flex items-start gap-2 rounded-xl bg-mist-1 p-3 text-xs leading-relaxed text-ink-soft">
        <Icon name="lucide:info" class="mt-0.5 shrink-0 text-brand-700" />
        Both the open switch and the deadline are enforced again on the server, so a closed competition can never take an entry.
      </p>
    </AdminFormSection>

    <AdminFormSection title="Description" description="Intro shown on the competition page." icon="lucide:text">
      <AdminRichText v-model="form.description" />
    </AdminFormSection>

    <AdminFormSection title="Rules" description="Full rules and judging criteria." icon="lucide:scale">
      <AdminRichText v-model="form.rules" />
    </AdminFormSection>

    <AdminFormSection title="Judging" description="Controls whether judges can save scores for this competition." icon="lucide:gavel">
      <AdminSwitch v-model="form.judgingOpen" label="Judging open" hint="Judges can still view teams and the leaderboard when off; only saving new scores is blocked." />
    </AdminFormSection>

    <AdminFormSection title="Prizes" description="Listed in order on the public page." icon="lucide:banknote">
      <AdminPrizeEditor v-model="form.prizes" />
    </AdminFormSection>

    <AdminFormSection title="Cover image" description="Card image in competition listings." icon="lucide:image">
      <AdminImageUploader v-model="form.coverImage" />
    </AdminFormSection>

    <AdminFormActions :saving="saving" label="Save competition" />
  </form>
</template>
