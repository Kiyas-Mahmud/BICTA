<script setup lang="ts">
export interface PrizeRow {
  position: string
  amount: string
  note?: string | null
}

const model = defineModel<PrizeRow[]>({ default: () => [] })

function add() {
  model.value = [...model.value, { position: '', amount: '', note: '' }]
}
function remove(i: number) {
  model.value = model.value.filter((_, idx) => idx !== i)
}
function move(i: number, dir: -1 | 1) {
  const next = i + dir
  if (next < 0 || next >= model.value.length) return
  const copy = [...model.value]
  const [row] = copy.splice(i, 1)
  copy.splice(next, 0, row!)
  model.value = copy
}
</script>

<template>
  <div class="space-y-2.5">
    <div v-for="(prize, i) in model" :key="i" class="rounded-xl border border-line bg-mist-1 p-3">
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800">{{ i + 1 }}</span>
        <p class="flex-1 text-xs font-bold uppercase tracking-wider text-ink-faint">Prize {{ i + 1 }}</p>
        <button type="button" class="icon-btn-sm h-7 w-7" :disabled="i === 0" aria-label="Move prize up" @click="move(i, -1)">
          <Icon name="lucide:chevron-up" />
        </button>
        <button type="button" class="icon-btn-sm h-7 w-7" :disabled="i === model.length - 1" aria-label="Move prize down" @click="move(i, 1)">
          <Icon name="lucide:chevron-down" />
        </button>
        <button type="button" class="icon-btn-sm icon-btn-danger h-7 w-7" aria-label="Remove prize" @click="remove(i)">
          <Icon name="lucide:trash-2" />
        </button>
      </div>
      <div class="mt-2.5 grid gap-2 sm:grid-cols-[1fr_9rem] lg:grid-cols-[1fr_9rem_1fr]">
        <input v-model="prize.position" class="input !bg-white" placeholder="Position (e.g. Champion)" aria-label="Prize position" />
        <input v-model="prize.amount" class="input !bg-white" placeholder="Amount" aria-label="Prize amount" />
        <input v-model="prize.note" class="input !bg-white" placeholder="Note (optional)" aria-label="Prize note" />
      </div>
    </div>

    <p v-if="!model.length" class="rounded-xl border border-dashed border-line bg-mist-1 px-4 py-5 text-center text-sm text-ink-faint">
      No prizes yet. Rows without a position and amount are dropped on save.
    </p>

    <button type="button" class="btn-ghost" @click="add"><Icon name="lucide:plus" /> Add prize</button>
  </div>
</template>
