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
</script>

<template>
  <div class="space-y-2">
    <div v-for="(prize, i) in model" :key="i" class="flex items-center gap-2 rounded-xl border border-line bg-mist-1 p-2">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800">{{ i + 1 }}</span>
      <input v-model="prize.position" class="input flex-1 !bg-white" placeholder="Position (e.g. Champion)" />
      <input v-model="prize.amount" class="input w-40 !bg-white" placeholder="Amount" />
      <input v-model="prize.note" class="input flex-1 !bg-white" placeholder="Note (optional)" />
      <button type="button" class="icon-btn hover:bg-red-50 hover:text-red-600" title="Remove prize" @click="remove(i)">
        <Icon name="lucide:trash-2" />
      </button>
    </div>
    <button type="button" class="btn-ghost" @click="add"><Icon name="lucide:plus" /> Add prize</button>
  </div>
</template>
