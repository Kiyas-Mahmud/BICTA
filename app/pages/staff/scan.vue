<script setup lang="ts">
// Volunteer / admin QR scanner for event-day kit/food/snack collection.
// Camera scanning is client-only (html5-qrcode); manual token entry is the
// fallback when a camera isn't available.
definePageMeta({ layout: false, middleware: 'admin' })

const { session, fetch: refreshSession } = useUserSession()
const staff = computed(() => (session.value as any)?.user as { name: string; role?: string } | undefined)

const { data: checkpoints } = await useFetch('/api/staff/checkpoints')
const activeCheckpoint = ref<number | null>(null)
watchEffect(() => {
  if (activeCheckpoint.value == null && checkpoints.value?.length) activeCheckpoint.value = checkpoints.value[0].id
})

interface ScanResult {
  tone: 'ok' | 'already' | 'error'
  name?: string
  team?: string
  message: string
  at: number
}
const last = ref<ScanResult | null>(null)
const scanning = ref(false)
const manualToken = ref('')

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
  try {
    const info = await $fetch('/api/staff/scan', { query: { token } })
    const res = await $fetch('/api/staff/checkin', {
      method: 'POST',
      body: { accountId: info.account.id, checkpointId: activeCheckpoint.value },
    })
    const cpName = checkpoints.value?.find((c) => c.id === activeCheckpoint.value)?.name ?? 'item'
    last.value = {
      tone: res.result === 'collected' ? 'ok' : 'already',
      name: info.account.fullName,
      team: info.memberships[0]?.teamName ?? info.memberships[0]?.competition ?? '',
      message: res.result === 'collected' ? `${cpName} collected` : `Already collected ${cpName}`,
      at: now,
    }
    if (navigator.vibrate) navigator.vibrate(res.result === 'collected' ? 60 : [40, 40, 40])
  } catch (e: any) {
    last.value = { tone: 'error', message: e?.data?.statusMessage ?? 'Unknown QR code', at: now }
    if (navigator.vibrate) navigator.vibrate([80, 60, 80])
  }
}

function submitManual() {
  if (manualToken.value.trim()) {
    handleToken(manualToken.value.trim())
    manualToken.value = ''
  }
}

// ---- camera lifecycle ----
let scanner: any = null
const readerId = 'qr-reader'

async function startCamera() {
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
    last.value = { tone: 'error', message: 'Camera unavailable — use manual entry below.', at: Date.now() }
  }
}
async function stopCamera() {
  try { await scanner?.stop() } catch {}
  scanner = null
  scanning.value = false
}
onBeforeUnmount(stopCamera)

async function logout() {
  await stopCamera()
  await $fetch('/api/admin/auth/logout', { method: 'POST' })
  await refreshSession()
  await navigateTo('/admin/login')
}

useSeoMeta({ title: 'Scanner', robots: 'noindex' })
</script>

<template>
  <div class="flex min-h-screen flex-col bg-ink text-white">
    <header class="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <p class="flex items-center gap-2 font-extrabold tracking-tight">
        <Icon name="lucide:scan-line" class="text-brand-400" /> BICTA Scanner
      </p>
      <div class="flex items-center gap-3 text-sm">
        <span class="hidden text-white/60 sm:block">{{ staff?.name }}</span>
        <button class="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20" @click="logout">Log out</button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-md flex-1 px-4 py-5">
      <!-- checkpoint selector -->
      <p class="text-xs font-bold uppercase tracking-wide text-white/50">Collecting</p>
      <div v-if="checkpoints?.length" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="c in checkpoints"
          :key="c.id"
          class="rounded-full px-4 py-2 text-sm font-bold transition-colors"
          :class="activeCheckpoint === c.id ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'"
          @click="activeCheckpoint = c.id"
        >
          {{ c.name }}
        </button>
      </div>
      <p v-else class="mt-2 text-sm text-white/50">No active checkpoints. Ask an admin to add them.</p>

      <!-- result banner -->
      <div
        v-if="last"
        class="mt-5 rounded-2xl p-5 text-center"
        :class="{
          'bg-emerald-500 text-white': last.tone === 'ok',
          'bg-amber-500 text-white': last.tone === 'already',
          'bg-red-500 text-white': last.tone === 'error',
        }"
      >
        <Icon :name="last.tone === 'ok' ? 'lucide:check-circle-2' : last.tone === 'already' ? 'lucide:alert-circle' : 'lucide:x-circle'" class="mx-auto text-4xl" />
        <p v-if="last.name" class="mt-2 text-lg font-extrabold">{{ last.name }}</p>
        <p v-if="last.team" class="text-sm text-white/80">{{ last.team }}</p>
        <p class="mt-1 font-bold">{{ last.message }}</p>
      </div>

      <!-- camera -->
      <div class="mt-5">
        <div :id="readerId" class="overflow-hidden rounded-2xl bg-black" :class="scanning ? '' : 'hidden'" />
        <button v-if="!scanning" class="btn-primary w-full !py-3.5" @click="startCamera">
          <Icon name="lucide:camera" /> Start camera
        </button>
        <button v-else class="w-full rounded-xl bg-white/10 py-3 font-bold hover:bg-white/20" @click="stopCamera">
          Stop camera
        </button>
      </div>

      <!-- manual fallback -->
      <form class="mt-5 flex gap-2" @submit.prevent="submitManual">
        <input
          v-model="manualToken"
          class="flex-1 rounded-xl border-0 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400"
          placeholder="Or type the code under the QR"
        />
        <button type="submit" class="rounded-xl bg-white/10 px-4 font-bold hover:bg-white/20">Go</button>
      </form>
    </main>
  </div>
</template>
