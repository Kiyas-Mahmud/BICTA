<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'participant' })

const { data, refresh, pending } = await useFetch('/api/participant/me')
// Competitions still open to this participant (one team per competition).
const { data: available, refresh: refreshAvailable } = await useFetch('/api/participant/available-competitions')

function statusBadge(status: string) {
  if (status === 'confirmed') return 'badge badge-green'
  if (status === 'rejected') return 'badge badge-gray'
  return 'badge badge-amber'
}

const copiedFor = ref<number | null>(null)
async function copyInvite(memberId: number, link: string) {
  try {
    await navigator.clipboard.writeText(link)
    copiedFor.value = memberId
    setTimeout(() => (copiedFor.value === memberId) && (copiedFor.value = null), 2000)
  } catch {
    err.value = 'Could not copy the link. Long-press it to copy manually.'
  }
}

// Add / remove teammate (leader only). Per-team form state keyed by registrationId.
const newMember = reactive<Record<number, { name: string; email: string }>>({})
const busy = ref(false)
const err = ref('')

function draft(regId: number) {
  if (!newMember[regId]) newMember[regId] = { name: '', email: '' }
  return newMember[regId]
}

async function addMember(regId: number) {
  const d = draft(regId)
  if (!d.name || !d.email) return
  err.value = ''
  busy.value = true
  try {
    await $fetch(`/api/participant/team/${regId}/members`, { method: 'POST', body: { name: d.name, email: d.email } })
    d.name = ''
    d.email = ''
    await refresh()
  } catch (e: any) {
    err.value = e?.data?.statusMessage ?? 'Could not add member.'
  } finally {
    busy.value = false
  }
}

async function removeMember(regId: number, memberId: number, name: string) {
  if (!window.confirm(`Remove ${name} from the team?`)) return
  err.value = ''
  busy.value = true
  try {
    await $fetch(`/api/participant/team/${regId}/members/${memberId}`, { method: 'DELETE' })
    await Promise.all([refresh(), refreshAvailable()])
  } catch (e: any) {
    err.value = e?.data?.statusMessage ?? 'Could not remove member.'
  } finally {
    busy.value = false
  }
}

useSeoMeta({ title: 'My dashboard', robots: 'noindex' })
</script>

<template>
  <section class="container-site py-8 sm:py-12">
    <div v-if="data">
      <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Hi {{ data.account.fullName.split(' ')[0] }} 👋</h1>
      <p class="mt-1 text-ink-soft">Your teams, event details and personal check-in QR — all in one place.</p>

      <p v-if="err" class="form-error mt-5">{{ err }}</p>

      <div class="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        <!-- LEFT: QR + collection -->
        <div class="space-y-6">
          <!-- QR card -->
          <div class="card overflow-hidden">
            <div class="gradient-brand px-6 py-4 text-white">
              <p class="flex items-center gap-2 text-sm font-bold"><Icon name="lucide:qr-code" /> Your entry QR</p>
              <p class="mt-0.5 text-xs text-white/70">Show this at kit, food & snack booths.</p>
            </div>
            <div class="p-6 text-center">
              <img :src="data.qr" alt="Your personal QR code" class="mx-auto h-52 w-52 rounded-xl border border-line" />
              <a :href="data.qr" download="bicta-qr.png" class="btn-secondary mt-4 w-full">
                <Icon name="lucide:download" /> Download QR
              </a>
            </div>
          </div>

          <!-- Collection checklist -->
          <div v-if="data.collection.length" class="card p-6">
            <p class="flex items-center gap-2 font-bold"><Icon name="lucide:package-check" class="text-brand-600" /> Collected on event day</p>
            <ul class="mt-4 space-y-2.5">
              <li v-for="c in data.collection" :key="c.id" class="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <span class="flex items-center gap-2.5 font-semibold">
                  <Icon :name="`lucide:${c.icon || 'circle'}`" class="text-ink-soft" />
                  {{ c.name }}
                </span>
                <span v-if="c.collected" class="badge badge-green"><Icon name="lucide:check" /> Collected</span>
                <span v-else class="badge badge-gray">Not yet</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- RIGHT: teams -->
        <div class="space-y-6">
          <div v-for="team in data.teams" :key="team.registrationId" class="card p-6 sm:p-7">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-brand-600">{{ team.competition?.name }}</p>
                <h2 class="mt-1 text-xl font-extrabold tracking-tight">{{ team.teamName || 'Solo entry' }}</h2>
                <p v-if="team.event" class="mt-1 text-sm text-ink-soft">
                  {{ team.event.title }}<span v-if="team.event.venue"> · {{ team.event.venue }}</span>
                </p>
              </div>
              <div class="flex flex-col items-end gap-2">
                <span :class="statusBadge(team.status)">{{ team.status }}</span>
                <span class="badge badge-blue">{{ team.myRole === 'leader' ? 'You are leader' : 'Member' }}</span>
              </div>
            </div>

            <p v-if="team.competition?.registrationDeadline" class="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
              <Icon name="lucide:calendar-clock" />
              Registration deadline: <span class="font-bold text-ink">{{ formatDate(team.competition.registrationDeadline) }}</span>
            </p>

            <!-- roster -->
            <div class="mt-5">
              <p class="text-xs font-bold uppercase tracking-wide text-ink-faint">Team roster ({{ team.roster.length }})</p>
              <ul class="mt-3 space-y-2.5">
                <li v-for="m in team.roster" :key="m.memberId" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line p-3.5 sm:px-4 sm:py-3 bg-white/50">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-600">
                      {{ m.fullName.charAt(0) }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-ink">{{ m.fullName }}</p>
                      <p class="truncate text-xs text-ink-faint">{{ m.email }}</p>
                    </div>
                  </div>
                  <div class="flex items-center justify-between sm:justify-end gap-2 border-t border-line/40 pt-2 sm:border-t-0 sm:pt-0">
                    <div class="flex items-center gap-1.5">
                      <span v-if="m.role === 'leader'" class="badge badge-blue">Leader</span>
                      <span v-else-if="m.status === 'invited'" class="badge badge-amber" title="Hasn't set a password yet">Invited</span>
                      <span v-else class="badge badge-green">Active</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <!-- Leader can hand the set-password link over directly,
                           rather than relying on the invite email arriving. -->
                      <button
                        v-if="m.inviteLink"
                        class="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
                        :title="`Copy ${m.fullName}'s set-password link`"
                        @click="copyInvite(m.memberId, m.inviteLink)"
                      >
                        <Icon :name="copiedFor === m.memberId ? 'lucide:check' : 'lucide:link'" />
                        {{ copiedFor === m.memberId ? 'Copied' : 'Invite link' }}
                      </button>
                      <button
                        v-if="team.canManage && m.role !== 'leader'"
                        class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove member"
                        :disabled="busy"
                        @click="removeMember(team.registrationId, m.memberId, m.fullName)"
                      >
                        <Icon name="lucide:x" />
                      </button>
                    </div>
                  </div>
                </li>
              </ul>

              <!-- add member (leader, before deadline) -->
              <div v-if="team.canManage && team.competition && team.roster.length < team.competition.maxTeamSize" class="mt-4 rounded-xl border border-dashed border-line p-4 bg-mist-1/30">
                <p class="text-xs font-bold uppercase tracking-wide text-ink-faint">Add a teammate</p>
                <div class="mt-3 flex flex-col gap-2.5 sm:flex-row">
                  <input v-model="draft(team.registrationId).name" class="field sm:flex-1" placeholder="Full name" maxlength="150" />
                  <input v-model="draft(team.registrationId).email" type="email" class="field sm:flex-1" placeholder="Email" maxlength="254" />
                  <button class="btn-primary shrink-0 justify-center" :disabled="busy" @click="addMember(team.registrationId)">
                    <Icon name="lucide:user-plus" /> Add
                  </button>
                </div>
                <p class="mt-2 text-xs text-ink-soft">
                  They'll get an email invite with their own QR code. If it doesn't arrive, copy their
                  <strong>Invite link</strong> from the roster above and send it yourself.
                </p>
              </div>
              <p v-else-if="team.myRole === 'leader' && !team.canManage" class="mt-4 text-xs text-ink-faint">
                The registration deadline has passed — the team is now locked.
              </p>
            </div>
          </div>

          <div v-if="!data.teams.length" class="card p-10 text-center text-ink-soft">
            You're not on any team yet.
            <NuxtLink to="/events" class="font-semibold text-brand-600 hover:underline">Browse competitions</NuxtLink>.
          </div>

          <!-- Enter another competition. One team per competition, but as many
               competitions as are open. -->
          <div class="card p-6 sm:p-7">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-extrabold tracking-tight">Enter another competition</h2>
                <p class="mt-1 text-sm text-ink-soft">You can join one team per competition.</p>
              </div>
              <span v-if="available?.length" class="badge badge-blue">{{ available.length }} open</span>
            </div>

            <ul v-if="available?.length" class="mt-5 space-y-2.5">
              <li
                v-for="c in available"
                :key="c.id"
                class="flex flex-col gap-3 rounded-xl border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-ink">{{ c.name }}</p>
                  <p class="truncate text-xs text-ink-faint">
                    {{ c.eventTitle }}
                    <template v-if="c.registrationDeadline"> · closes {{ formatDate(c.registrationDeadline) }}</template>
                    <template v-if="c.teamBased"> · teams up to {{ c.maxTeamSize }}</template>
                  </p>
                </div>
                <NuxtLink :to="`/events/${c.eventSlug}/${c.slug}/register`" class="btn-primary shrink-0 justify-center !py-2.5 text-sm">
                  Register <Icon name="lucide:arrow-right" />
                </NuxtLink>
              </li>
            </ul>

            <p v-else class="mt-5 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">
              You're entered in every competition that's currently open. Nice.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="pending" class="py-20 text-center text-ink-faint">Loading your dashboard…</div>
  </section>
</template>
