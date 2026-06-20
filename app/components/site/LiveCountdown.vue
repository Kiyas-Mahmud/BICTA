<script setup lang="ts">
const props = defineProps<{ target: string }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => timer && clearInterval(timer))

const parts = computed(() => {
  const end = new Date(props.target.length === 10 ? `${props.target}T00:00:00` : props.target).getTime()
  let diff = Math.max(0, end - now.value)
  const day = Math.floor(diff / 86_400_000); diff -= day * 86_400_000
  const hour = Math.floor(diff / 3_600_000); diff -= hour * 3_600_000
  const min = Math.floor(diff / 60_000); diff -= min * 60_000
  const sec = Math.floor(diff / 1000)
  return [
    { v: day, l: 'Days' },
    { v: hour, l: 'Hours' },
    { v: min, l: 'Minutes' },
    { v: sec, l: 'Seconds' },
  ]
})
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="flex items-center gap-2 sm:gap-3">
    <template v-for="(p, i) in parts" :key="p.l">
      <div class="flex flex-col items-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-mist-1 text-2xl font-extrabold tabular-nums text-ink sm:h-16 sm:w-16">
          {{ pad(p.v) }}
        </div>
        <span class="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-faint">{{ p.l }}</span>
      </div>
      <span v-if="i < parts.length - 1" class="pb-5 text-xl font-bold text-ink-faint">:</span>
    </template>
  </div>
</template>
