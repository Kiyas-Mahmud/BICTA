<script setup lang="ts">
// Volunteer / admin QR scanner for event-day kit/food/snack collection.
// Camera scanning is client-only (html5-qrcode); manual token entry is the
// fallback when a camera isn't available.
definePageMeta({ layout: 'staff', middleware: 'admin' })

const { session } = useUserSession()
const staff = computed(() => (session.value as any)?.user as { name: string; role?: string } | undefined)

const { data: checkpoints } = await useFetch('/api/staff/checkpoints')
// What this volunteer is assigned to; admins come back unscoped.
const { data: scope } = await useFetch('/api/staff/me')
const activeCheckpoint = ref<number | null>(null)
watchEffect(() => {
  if (activeCheckpoint.value == null && checkpoints.value?.length) activeCheckpoint.value = checkpoints.value[0].id
})
const activeName = computed(() => checkpoints.value?.find((c) => c.id === activeCheckpoint.value)?.name ?? 'item')

interface ScanResult {
  tone: 'ok' | 'already' | 'error'
  name?: string
  team?: string
  message: string
  at: number
  /** checkpoint ids this person already had, for the status chips */
  collected?: number[]
}
const last = ref<ScanResult | null>(null)
const history = ref<ScanResult[]>([])
const scanning = ref(false)
const manualToken = ref('')
const busy = ref(false)

// Prevent the camera firing the same code dozens of times a second.
let lastToken = ''
let lastAt = 0

async function handleToken(token: string) {
  const now = Date.now()
  if (token === lastToken && now - lastAt < 2500) return
  lastToken = token
  lastAt = now
  if (!activeCheckpoint.value) {
    last.value = { tone: 'error', message: 'Pick a checkpoint first.', at: now }
    return
  }
  busy.value = true
  try {
    const info = await $fetch('/api/staff/scan', { query: { token } })
    const res = await $fetch('/api/staff/checkin', {
      method: 'POST',
      body: { accountId: info.account.id, checkpointId: activeCheckpoint.value },
    })
    const cpName = checkpoints.value?.find((c) => c.id === activeCheckpoint.value)?.name ?? 'item'
    const already = info.collected.map((c) => c.checkpointId)
    last.value = {
      tone: res.result === 'collected' ? 'ok' : 'already',
      name: info.account.fullName,
      team: info.memberships[0]?.teamName ?? info.memberships[0]?.competition ?? '',
      message: res.result === 'collected' ? `${cpName} collected` : `Already collected ${cpName}`,
      at: now,
      collected: [...new Set([...already, activeCheckpoint.value])],
    }
    if (navigator.vibrate) navigator.vibrate(res.result === 'collected' ? 60 : [40, 40, 40])
  } catch (e: any) {
    last.value = { tone: 'error', message: e?.data?.statusMessage ?? 'Unknown QR code', at: now }
    if (navigator.vibrate) navigator.vibrate([80, 60, 80])
  } finally {
    busy.value = false
    history.value = [last.value!, ...history.value].slice(0, 12)
  }
}

function submitManual() {
  if (manualToken.value.trim()) {
    handleToken(manualToken.value.trim())
    manualToken.value = ''
  }
}

// Counts for this shift — kept in memory, they reset with the page.
const stats = computed(() => ({
  collected: history.value.filter((h) => h.tone === 'ok').length,
  repeat: history.value.filter((h) => h.tone === 'already').length,
  failed: history.value.filter((h) => h.tone === 'error').length,
}))

const tones = {
  ok: { wrap: 'bg-emerald-500 text-white', icon: 'lucide:circle-check-big', dot: 'bg-emerald-400' },
  already: { wrap: 'bg-amber-500 text-white', icon: 'lucide:circle-alert', dot: 'bg-amber-400' },
  error: { wrap: 'bg-red-500 text-white', icon: 'lucide:circle-x', dot: 'bg-red-400' },
} as const

// ---- camera lifecycle ----
let scanner: any = null
const readerId = 'qr-reader'
const cameraError = ref('')

async function startCamera() {
  cameraError.value = ''
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    scanner = new Html5Qrcode(readerId)
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decoded: string) => handleToken(decoded),
      () => {},
    )
    scanning.value = true
  } catch {
    cameraError.value = 'Camera unavailable. Allow camera access, or type the code under the QR instead.'
    last.value = { tone: 'error', message: 'Camera unavailable — use manual entry below.', at: Date.now() }
  }
}
async function stopCamera() {
  try { await scanner?.stop() } catch {}
  scanner = null
  scanning.value = false
}
onBeforeUnmount(stopCamera)

// The shell stops the camera before dropping the session.
const { onBeforeLogout } = useStaffShell()
onBeforeLogout(stopCamera)

useSeoMeta({ title: 'Scanner', robots: 'noindex' })
</script>

<template>
  <div class="space-y-5">
    <!-- shift summary -->
    <section class="scan-card p-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/45">This shift</p>
          <p class="mt-0.5 truncate text-lg sm:text-xl font-extrabold">Hi {{ (staff?.name || 'there').split(' ')[0] }}</p>
          <p v-if="scope?.scoped" class="mt-1 truncate text-xs text-white/50">
            {{ scope.event?.title }} · {{ scope.competitions.map((c) => c.name).join(', ') || 'no competitions assigned' }}
          </p>
          <p v-else class="mt-1 text-xs text-white/50">All competitions</p>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center w-full sm:w-auto sm:flex sm:shrink-0">
          <div class="rounded-xl bg-emerald-500/15 p-2 sm:px-3 sm:py-2">
            <p class="text-base sm:text-lg font-extrabold tabular-nums text-emerald-300">{{ stats.collected }}</p>
            <p class="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-wider text-white/45 truncate">Handed out</p>
          </div>
          <div class="rounded-xl bg-amber-500/15 p-2 sm:px-3 sm:py-2">
            <p class="text-base sm:text-lg font-extrabold tabular-nums text-amber-300">{{ stats.repeat }}</p>
            <p class="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-wider text-white/45 truncate">Repeat</p>
          </div>
          <div class="rounded-xl bg-white/[0.06] p-2 sm:px-3 sm:py-2">
            <p class="text-base sm:text-lg font-extrabold tabular-nums text-white/70">{{ stats.failed }}</p>
            <p class="text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-wider text-white/45 truncate">Failed</p>
          </div>
        </div>
      </div>
    </section>

    <!-- checkpoint selector -->
    <section>
      <p class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/45">Collecting</p>
      <div v-if="checkpoints?.length" class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Checkpoint">
        <button
          v-for="c in checkpoints"
          :key="c.id"
          class="scan-chip"
          :aria-pressed="activeCheckpoint === c.id"
          @click="activeCheckpoint = c.id"
        >
          <Icon :name="c.icon ? `lucide:${c.icon}` : 'lucide:package'" class="text-base" />
          {{ c.name }}
        </button>
      </div>
      <p v-else class="scan-card mt-2 flex items-start gap-2.5 p-4 text-sm text-white/60">
        <Icon name="lucide:triangle-alert" class="mt-0.5 shrink-0 text-amber-300" />
        No active checkpoints for the current event. Ask an admin to add them under Check-in Points.
      </p>
    </section>

    <!-- result -->
    <Transition name="dlg">
      <section
        v-if="last"
        :key="last.at"
        class="pop-in rounded-2xl p-5 text-center"
        :class="tones[last.tone].wrap"
        role="status"
        aria-live="assertive"
      >
        <Icon :name="tones[last.tone].icon" class="mx-auto text-4xl" />
        <p v-if="last.name" class="mt-2 text-xl font-extrabold">{{ last.name }}</p>
        <p v-if="last.team" class="text-sm text-white/80">{{ last.team }}</p>
        <p class="mt-1 text-base font-bold">{{ last.message }}</p>

        <ul v-if="last.collected && checkpoints?.length" class="mt-3.5 flex flex-wrap justify-center gap-1.5">
          <li
            v-for="c in checkpoints"
            :key="c.id"
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold"
            :class="last.collected.includes(c.id) ? 'bg-white/25' : 'bg-black/15 text-white/60'"
          >
            <Icon :name="last.collected.includes(c.id) ? 'lucide:check' : 'lucide:minus'" class="text-sm" />
            {{ c.name }}
          </li>
        </ul>
      </section>
    </Transition>

    <!-- camera -->
    <section class="scan-card overflow-hidden">
      <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p class="flex items-center gap-2 text-sm font-bold">
          <Icon name="lucide:camera" class="text-brand-300" /> Camera
        </p>
        <span v-if="scanning" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Scanning for {{ activeName }}
        </span>
        <span v-else class="text-xs font-semibold text-white/40">Idle</span>
      </div>

      <div class="p-4">
        <div
          :id="readerId"
          class="relative overflow-hidden rounded-2xl bg-black"
          :class="[scanning ? 'scan-halo' : 'hidden']"
        />

        <div v-if="!scanning" class="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center">
          <Icon name="lucide:qr-code" class="mx-auto text-3xl text-white/30" />
          <p class="mt-2 text-sm font-semibold text-white/70">Point the camera at a participant's QR</p>
          <p class="mt-1 text-xs text-white/40">Each person can collect {{ activeName }} once.</p>
        </div>

        <p v-if="cameraError" class="mt-3 rounded-xl bg-red-500/15 px-3.5 py-2.5 text-sm font-semibold text-red-200" role="alert">
          {{ cameraError }}
        </p>

        <div class="mt-4">
          <button v-if="!scanning" class="scan-btn" :disabled="!checkpoints?.length" @click="startCamera">
            <Icon name="lucide:camera" /> Start camera
          </button>
          <button v-else class="scan-btn-quiet" @click="stopCamera">
            <Icon name="lucide:camera-off" /> Stop camera
          </button>
        </div>
      </div>
    </section>

    <!-- manual fallback -->
    <section class="scan-card p-4">
      <label class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/45" for="manual-token">
        Manual entry
      </label>
      <form class="mt-2 flex gap-2" @submit.prevent="submitManual">
        <input
          id="manual-token"
          v-model="manualToken"
          class="scan-input flex-1"
          placeholder="Type the code under the QR"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <button type="submit" class="scan-chip !bg-white/[0.12] px-5" :disabled="busy">
          <Icon :name="busy ? 'lucide:loader-2' : 'lucide:corner-down-left'" :class="{ 'animate-spin': busy }" />
          Go
        </button>
      </form>
    </section>

    <!-- recent scans -->
    <section class="scan-card overflow-hidden">
      <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p class="flex items-center gap-2 text-sm font-bold"><Icon name="lucide:history" class="text-brand-300" /> Recent scans</p>
        <span class="text-xs font-semibold text-white/40">{{ history.length }}</span>
      </div>

      <ul v-if="history.length" class="divide-y divide-white/[0.07]">
        <li v-for="h in history" :key="h.at" class="flex items-center gap-3 px-4 py-3">
          <span class="h-2 w-2 shrink-0 rounded-full" :class="tones[h.tone].dot" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{{ h.name ?? 'Unknown code' }}</p>
            <p class="truncate text-xs text-white/45">{{ h.message }}</p>
          </div>
          <span class="shrink-0 text-xs tabular-nums text-white/40">{{ formatTime(h.at) }}</span>
        </li>
      </ul>

      <div v-else class="px-4 py-8 text-center">
        <Icon name="lucide:scan-line" class="mx-auto text-2xl text-white/25" />
        <p class="mt-2 text-sm font-semibold text-white/60">No scans yet on this device</p>
        <p class="mt-1 text-xs text-white/35">Pick a checkpoint, start the camera, and every scan lands here.</p>
      </div>
    </section>
  </div>
</template>
