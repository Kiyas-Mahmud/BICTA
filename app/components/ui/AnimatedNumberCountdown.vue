<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps<{ endDate: Date | string; class?: string }>()

// The render clock is shared state, not a fresh Date.now(), so the server and
// the first client render agree. A plain ref would compute a different second
// on each side, and because the digits sit inside a <Transition> keyed on their
// own value, that mismatch makes Vue abandon hydration of the surrounding
// subtree and leave the page blank. The real clock starts after mount.
const now = useState<number>('countdown-render-clock', () => Date.now())
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => timer && clearInterval(timer))

const diffParts = computed(() => {
  const dateStr = props.endDate instanceof Date ? props.endDate.toISOString() : props.endDate
  // Date-only and naive timestamps are pinned to UTC, matching how the database
  // stores dates. Without the Z they would parse in the *local* zone, so the
  // server (UTC) and a browser in another zone would render different digits
  // and break hydration.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateStr)
  const normalised = dateStr.length === 10 ? `${dateStr}T00:00:00Z` : hasZone ? dateStr : `${dateStr}Z`
  const end = new Date(normalised).getTime()
  let diff = Math.max(0, end - now.value)

  const days = Math.floor(diff / 86_400_000); diff -= days * 86_400_000
  const hours = Math.floor(diff / 3_600_000); diff -= hours * 3_600_000
  const mins = Math.floor(diff / 60_000); diff -= mins * 60_000
  const secs = Math.floor(diff / 1000)

  return { days, hours, mins, secs }
})

// Pad to at least two digits; days are free to grow past 99 (the previous
// CSS line-scroll approach silently rendered blank above 99).
const cells = computed(() => [
  { key: 'days', label: 'Days', value: String(diffParts.value.days).padStart(2, '0') },
  { key: 'hours', label: 'Hours', value: String(diffParts.value.hours).padStart(2, '0') },
  { key: 'mins', label: 'Mins', value: String(diffParts.value.mins).padStart(2, '0') },
  { key: 'secs', label: 'Secs', value: String(diffParts.value.secs).padStart(2, '0') },
])
</script>

<template>
  <div :class="['grid grid-cols-4 gap-2 sm:gap-3', props.class]">
    <div
      v-for="cell in cells"
      :key="cell.key"
      class="countdown-cell rounded-2xl border border-brand-100 bg-brand-50"
    >
      <!-- fixed-height window: digits animate inside it, never outside -->
      <span class="countdown-window text-brand-900" aria-hidden="true">
        <Transition name="countdown-digit">
          <span :key="cell.value" class="countdown-value">{{ cell.value }}</span>
        </Transition>
      </span>
      <span class="countdown-label text-brand-700">{{ cell.label }}</span>
      <span class="sr-only">{{ Number(cell.value) }} {{ cell.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.countdown-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* equal height across all four cells regardless of digit count */
  min-height: 5.25rem;
  padding: 0.75rem 0.25rem 0.625rem;
}

.countdown-window {
  position: relative;
  display: block;
  /* room for the glyphs plus descender space: no clipping, ever */
  height: 1.15em;
  width: 100%;
  font-size: clamp(1.5rem, 7vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.countdown-value {
  /* entering and leaving digits share one box, so nothing reflows */
  position: absolute;
  inset: 0;
  display: block;
  text-align: center;
  white-space: nowrap;
}

.countdown-label {
  margin-top: 0.5rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  line-height: 1;
}

/* digit roll: transform + opacity only, never triggers layout */
.countdown-digit-enter-active,
.countdown-digit-leave-active {
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.countdown-digit-enter-from {
  opacity: 0;
  transform: translateY(60%);
}
.countdown-digit-leave-to {
  opacity: 0;
  transform: translateY(-60%);
}

@media (min-width: 640px) {
  .countdown-cell {
    min-height: 6.25rem;
    padding: 1rem 0.5rem 0.875rem;
  }
  .countdown-window {
    font-size: clamp(2rem, 3.2vw, 2.75rem);
  }
  .countdown-label {
    font-size: 0.6875rem;
    margin-top: 0.625rem;
  }
}
</style>
