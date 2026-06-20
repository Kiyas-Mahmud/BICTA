<script setup lang="ts">
// Generic admin CRUD screen for the simple home-page list tables.
// Driven by a field config; reuses ImageUploader and RichText.

export interface Field {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'rich' | 'image' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
  colSpan?: 1 | 2
}

const props = defineProps<{
  title: string
  endpoint: string
  fields: Field[]
  columns: { key: string; label: string }[]
  emptyText?: string
  /** extra defaults merged into a new blank row */
  defaults?: Record<string, any>
}>()

const { data: rows, refresh } = await useFetch<any[]>(props.endpoint)

const editing = ref<Record<string, any> | null>(null)
const isNew = ref(false)
const saving = ref(false)
const error = ref('')

function blank() {
  const o: Record<string, any> = { sortOrder: (rows.value?.length ?? 0) + 1, ...props.defaults }
  for (const f of props.fields) if (!(f.key in o)) o[f.key] = f.type === 'number' ? null : ''
  return o
}
function startNew() {
  editing.value = blank()
  isNew.value = true
  error.value = ''
}
function startEdit(row: any) {
  editing.value = { ...row }
  isNew.value = false
  error.value = ''
}
function cancel() {
  editing.value = null
}

async function save() {
  if (!editing.value) return
  saving.value = true
  error.value = ''
  try {
    const url = isNew.value ? props.endpoint : `${props.endpoint}/${editing.value.id}`
    await $fetch(url, { method: isNew.value ? 'POST' : 'PUT', body: editing.value })
    editing.value = null
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Save failed. Check the fields.'
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  if (!window.confirm('Delete this item?')) return
  await $fetch(`${props.endpoint}/${row.id}`, { method: 'DELETE' })
  await refresh()
}

function isImage(row: any, key: string) {
  return typeof row[key] === 'string' && row[key].startsWith('/uploads/')
}
function cell(row: any, key: string) {
  const v = row[key]
  if (typeof v === 'string') return v.replace(/<[^>]+>/g, '').slice(0, 60)
  return v ?? '—'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
      <button class="btn-primary" @click="startNew"><Icon name="lucide:plus" /> New</button>
    </div>

    <!-- editor panel -->
    <div v-if="editing" class="mt-6 rounded-xl border border-line bg-white p-6">
      <h2 class="mb-4 text-lg font-semibold">{{ isNew ? 'Add' : 'Edit' }} item</h2>
      <div class="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div v-for="f in fields" :key="f.key" :class="f.colSpan === 2 || f.type === 'rich' || f.type === 'textarea' || f.type === 'image' ? 'sm:col-span-2' : ''">
          <label class="label">{{ f.label }}</label>
          <AdminRichText v-if="f.type === 'rich'" v-model="editing[f.key]" />
          <AdminImageUploader v-else-if="f.type === 'image'" v-model="editing[f.key]" />
          <textarea v-else-if="f.type === 'textarea'" v-model="editing[f.key]" class="input" rows="3" :placeholder="f.placeholder" />
          <select v-else-if="f.type === 'select'" v-model="editing[f.key]" class="input">
            <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <input v-else-if="f.type === 'number'" v-model.number="editing[f.key]" type="number" class="input" :placeholder="f.placeholder" />
          <input v-else-if="f.type === 'date'" v-model="editing[f.key]" type="date" class="input" />
          <input v-else v-model="editing[f.key]" class="input" :placeholder="f.placeholder" />
        </div>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      <div class="mt-5 flex gap-3">
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button>
        <button class="btn-ghost" @click="cancel">Cancel</button>
      </div>
    </div>

    <!-- list -->
    <div class="mt-6 overflow-hidden rounded-xl border border-line bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-line bg-neutral-50 text-xs uppercase text-ink-soft">
          <tr>
            <th v-for="c in columns" :key="c.key" class="px-4 py-3">{{ c.label }}</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-b border-line transition-colors last:border-0 hover:bg-neutral-50">
            <td v-for="c in columns" :key="c.key" class="px-4 py-3">
              <Icon v-if="isImage(row, c.key)" name="lucide:image" class="text-ink-faint" />
              <template v-else>{{ cell(row, c.key) }}</template>
            </td>
            <td class="px-4 py-3 text-right">
              <button class="mr-3 font-medium text-accent hover:underline" @click="startEdit(row)">Edit</button>
              <button class="font-medium text-red-600 hover:underline" @click="remove(row)">Delete</button>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td :colspan="columns.length + 1" class="px-4 py-10 text-center text-ink-faint">{{ emptyText ?? 'Nothing yet.' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
