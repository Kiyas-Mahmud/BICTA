<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps<{ endDate: Date | string; class?: string }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => timer && clearInterval(timer))

const diffParts = computed(() => {
  const dateStr = props.endDate instanceof Date ? props.endDate.toISOString() : props.endDate
  const end = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr).getTime()
  let diff = Math.max(0, end - now.value)
  
  const days = Math.floor(diff / 86_400_000); diff -= days * 86_400_000
  const hours = Math.floor(diff / 3_600_000); diff -= hours * 3_600_000
  const mins = Math.floor(diff / 60_000); diff -= mins * 60_000
  const secs = Math.floor(diff / 1000)
  
  return { days, hours, mins, secs }
})
</script>

<template>
  <div :class="['grid grid-flow-col gap-5 text-center auto-cols-max text-ink', props.class]">
    <div class="flex flex-col">
      <span class="countdown font-mono text-4xl sm:text-5xl">
        <span :style="{ '--value': diffParts.days }"></span>
      </span>
      <span class="text-sm">days</span>
    </div>
    <div class="flex flex-col">
      <span class="countdown font-mono text-4xl sm:text-5xl">
        <span :style="{ '--value': diffParts.hours }"></span>
      </span>
      <span class="text-sm">hours</span>
    </div>
    <div class="flex flex-col">
      <span class="countdown font-mono text-4xl sm:text-5xl">
        <span :style="{ '--value': diffParts.mins }"></span>
      </span>
      <span class="text-sm">min</span>
    </div>
    <div class="flex flex-col">
      <span class="countdown font-mono text-4xl sm:text-5xl">
        <span :style="{ '--value': diffParts.secs }"></span>
      </span>
      <span class="text-sm">sec</span>
    </div>
  </div>
</template>

<style scoped>
.countdown {
  display: inline-flex;
}
.countdown > * {
  height: 1em;
  display: inline-block;
  overflow-y: hidden;
}
.countdown > *:before {
  position: relative;
  content: "00\A 01\A 02\A 03\A 04\A 05\A 06\A 07\A 08\A 09\A 10\A 11\A 12\A 13\A 14\A 15\A 16\A 17\A 18\A 19\A 20\A 21\A 22\A 23\A 24\A 25\A 26\A 27\A 28\A 29\A 30\A 31\A 32\A 33\A 34\A 35\A 36\A 37\A 38\A 39\A 40\A 41\A 42\A 43\A 44\A 45\A 46\A 47\A 48\A 49\A 50\A 51\A 52\A 53\A 54\A 55\A 56\A 57\A 58\A 59\A 60\A 61\A 62\A 63\A 64\A 65\A 66\A 67\A 68\A 69\A 70\A 71\A 72\A 73\A 74\A 75\A 76\A 77\A 78\A 79\A 80\A 81\A 82\A 83\A 84\A 85\A 86\A 87\A 88\A 89\A 90\A 91\A 92\A 93\A 94\A 95\A 96\A 97\A 98\A 99";
  white-space: pre;
  top: calc(var(--value) * -1em);
  transition: all 1s cubic-bezier(1, 0, 0, 1);
}
</style>
