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
    <div v-for="(prize, i) in model" :key="i" class="flex items-start gap-2">
      <input v-model="prize.position" class="input flex-1" placeholder="Position (e.g. Champion)" />
      <input v-model="prize.amount" class="input w-40" placeholder="Amount" />
      <input v-model="prize.note" class="input flex-1" placeholder="Note (optional)" />
      <button type="button" class="btn-ghost !px-3 text-red-600" title="Remove prize" @click="remove(i)">
        <Icon name="lucide:x" />
      </button>
    </div>
    <button type="button" class="btn-ghost" @click="add"><Icon name="lucide:plus" /> Add prize</button>
  </div>
</template>
