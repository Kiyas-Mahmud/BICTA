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
  subtitle?: string
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
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string') return v.replace(/<[^>]+>/g, '').slice(0, 80)
  return v ?? '—'
}
</script>

<template>
  <div>
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 text-sm text-ink-soft">{{ subtitle }}</p>
      </div>
      <button class="btn-primary" @click="startNew"><Icon name="lucide:plus" /> New</button>
    </div>

    <!-- editor panel -->
    <Transition
      enter-active-class="transition duration-200 ease-out" enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in" leave-to-class="-translate-y-2 opacity-0"
    >
      <div v-if="editing" class="mt-6 rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div class="mb-5 flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Icon :name="isNew ? 'lucide:plus' : 'lucide:pencil'" />
          </span>
          <h2 class="text-lg font-bold text-ink">{{ isNew ? 'Add' : 'Edit' }} item</h2>
        </div>
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
    </Transition>

    <!-- list -->
    <div class="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-line bg-mist-1 text-[0.68rem] uppercase tracking-wider text-ink-faint">
              <th v-for="c in columns" :key="c.key" class="px-5 py-3 font-bold">{{ c.label }}</th>
              <th class="px-5 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="group border-b border-line transition-colors last:border-0 hover:bg-mist-1">
              <td v-for="(c, ci) in columns" :key="c.key" class="px-5 py-3" :class="ci === 0 ? 'font-semibold text-ink' : 'text-ink-soft'">
                <img v-if="isImage(row, c.key)" :src="row[c.key]" alt="" class="h-10 w-10 rounded-lg border border-line object-cover" />
                <template v-else>{{ cell(row, c.key) }}</template>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-brand-50 hover:text-brand-700"
                    aria-label="Edit" @click="startEdit(row)"
                  >
                    <Icon name="lucide:pencil" />
                  </button>
                  <button
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete" @click="remove(row)"
                  >
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows?.length">
              <td :colspan="columns.length + 1" class="px-5 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-ink-faint">
                  <Icon name="lucide:inbox" class="text-3xl" />
                  <p class="text-sm">{{ emptyText ?? 'Nothing yet.' }}</p>
                  <button class="mt-1 text-sm font-bold text-brand-700 hover:text-brand-800" @click="startNew">+ Add the first one</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
