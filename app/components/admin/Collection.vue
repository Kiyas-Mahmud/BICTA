<script setup lang="ts">
import type { Ref } from 'vue'

// Generic admin CRUD screen for the simple home-page list tables.
// Driven by a field config; reuses ImageUploader and RichText.

export interface Field {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'rich' | 'image' | 'number' | 'date' | 'select' | 'toggle'
  /** static options, or a ref/computed of them for data-driven pickers */
  options?: { value: string | number | null; label: string }[] | Ref<{ value: string | number | null; label: string }[]>
  placeholder?: string
  hint?: string
  colSpan?: 1 | 2
}

function optionsOf(f: Field) {
  return (unref(f.options) ?? []) as { value: string | number | null; label: string }[]
}

const props = defineProps<{
  title: string
  subtitle?: string
  icon?: string
  endpoint: string
  fields: Field[]
  columns: { key: string; label: string }[]
  emptyText?: string
  /** extra defaults merged into a new blank row */
  defaults?: Record<string, any>
  /** label for the create button, e.g. "New question" */
  newLabel?: string
  /** query sent with the list request, e.g. { eventId } to scope to one event */
  query?: Record<string, any>
  /** hide the page header when embedded inside another screen */
  flush?: boolean
}>()

const { data: rows, refresh } = await useFetch<any[]>(props.endpoint, {
  query: computed(() => props.query ?? {}),
})
const toast = useToast()
const { confirm } = useConfirm()

const editing = ref<Record<string, any> | null>(null)
const isNew = ref(false)
const saving = ref(false)
const error = ref('')
const editorEl = ref<HTMLElement | null>(null)

function blank() {
  const o: Record<string, any> = { sortOrder: (rows.value?.length ?? 0) + 1, ...props.defaults }
  for (const f of props.fields) if (!(f.key in o)) o[f.key] = f.type === 'number' ? null : ''
  return o
}
async function focusEditor() {
  await nextTick()
  editorEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  editorEl.value?.querySelector<HTMLElement>('input, textarea, select')?.focus()
}
function startNew() {
  editing.value = blank()
  isNew.value = true
  error.value = ''
  focusEditor()
}
function startEdit(row: any) {
  editing.value = { ...row }
  isNew.value = false
  error.value = ''
  focusEditor()
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
    toast.success(isNew.value ? 'Item added' : 'Changes saved')
    editing.value = null
    await Promise.all([refresh(), refreshAdminStats()])
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Save failed. Check the fields.'
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  const label = String(row[props.columns[0]!.key] ?? 'this item').replace(/<[^>]+>/g, '').slice(0, 60)
  const ok = await confirm({
    title: 'Delete this item?',
    body: `"${label}" is removed from the public site permanently.`,
  })
  if (!ok) return
  await $fetch(`${props.endpoint}/${row.id}`, { method: 'DELETE' })
  if (editing.value?.id === row.id) editing.value = null
  await Promise.all([refresh(), refreshAdminStats()])
  toast.success('Item deleted')
}

// Escape closes the editor, matching the confirm dialog's behaviour.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && editing.value && !saving.value) cancel()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const search = ref('')
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value ?? []
  return (rows.value ?? []).filter((row) =>
    props.columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q)),
  )
})

function isImage(row: any, key: string) {
  return typeof row[key] === 'string' && row[key].startsWith('/uploads/')
}
function cell(row: any, key: string) {
  const v = row[key]
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string') return v.replace(/<[^>]+>/g, '').slice(0, 80)
  return v ?? '—'
}
function wide(f: Field) {
  return f.colSpan === 2 || f.type === 'rich' || f.type === 'textarea' || f.type === 'image'
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader v-if="!flush" :title="title" :subtitle="subtitle" :icon="icon">
      <template #actions>
        <button class="btn-primary !py-2.5" @click="startNew">
          <Icon name="lucide:plus" /> {{ newLabel ?? 'New' }}
        </button>
      </template>
    </AdminPageHeader>

    <!-- embedded: the parent screen owns the page header, so only the action shows -->
    <div v-else class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-extrabold text-ink">{{ title }}</h2>
        <p v-if="subtitle" class="mt-1 max-w-2xl text-sm text-ink-soft">{{ subtitle }}</p>
      </div>
      <button class="btn-primary !py-2.5" @click="startNew">
        <Icon name="lucide:plus" /> {{ newLabel ?? 'New' }}
      </button>
    </div>

    <!-- editor panel -->
    <Transition
      enter-active-class="transition duration-200 ease-out" enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in" leave-to-class="-translate-y-2 opacity-0"
    >
      <section v-if="editing" ref="editorEl" class="surface-raised overflow-hidden">
        <div class="panel-head">
          <div class="flex items-center gap-3">
            <span class="panel-glyph"><Icon :name="isNew ? 'lucide:plus' : 'lucide:pencil'" /></span>
            <div>
              <h2 class="console-h2">{{ isNew ? 'Add item' : 'Edit item' }}</h2>
              <p class="mt-0.5 text-xs text-ink-faint">Press Escape to cancel</p>
            </div>
          </div>
          <button class="icon-btn-sm" aria-label="Close editor" @click="cancel"><Icon name="lucide:x" /></button>
        </div>

        <form class="panel-body space-y-5" @submit.prevent="save">
          <div class="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div v-for="f in fields" :key="f.key" :class="wide(f) ? 'sm:col-span-2' : ''">
              <!-- the toggle renders its own label -->
              <label v-if="f.type !== 'toggle'" class="label" :for="`f-${f.key}`">{{ f.label }}</label>
              <AdminRichText v-if="f.type === 'rich'" v-model="editing[f.key]" />
              <AdminImageUploader v-else-if="f.type === 'image'" v-model="editing[f.key]" />
              <textarea v-else-if="f.type === 'textarea'" :id="`f-${f.key}`" v-model="editing[f.key]" class="input" rows="3" :placeholder="f.placeholder" />
              <select v-else-if="f.type === 'select'" :id="`f-${f.key}`" v-model="editing[f.key]" class="input">
                <option v-for="o in optionsOf(f)" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
              </select>
              <AdminSwitch
                v-else-if="f.type === 'toggle'"
                :id="`f-${f.key}`"
                v-model="editing[f.key]"
                :label="f.label"
                :hint="f.hint"
              />
              <input v-else-if="f.type === 'number'" :id="`f-${f.key}`" v-model.number="editing[f.key]" type="number" class="input" :placeholder="f.placeholder" />
              <input v-else-if="f.type === 'date'" :id="`f-${f.key}`" v-model="editing[f.key]" type="date" class="input" />
              <input v-else :id="`f-${f.key}`" v-model="editing[f.key]" class="input" :placeholder="f.placeholder" />
              <p v-if="f.hint" class="mt-1.5 text-xs text-ink-faint">{{ f.hint }}</p>
            </div>
          </div>

          <p v-if="error" class="form-error" role="alert">{{ error }}</p>

          <div class="flex flex-wrap gap-3">
            <button type="submit" class="btn-primary !py-2.5" :disabled="saving">
              <Icon :name="saving ? 'lucide:loader-2' : 'lucide:check'" :class="{ 'animate-spin': saving }" />
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
            <button type="button" class="btn-ghost" @click="cancel">Cancel</button>
          </div>
        </form>
      </section>
    </Transition>

    <div v-if="(rows?.length ?? 0) > 6" class="toolbar fade-up">
      <div class="relative min-w-[12rem] flex-1 sm:max-w-sm">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="collection-search">Search this list</label>
        <input id="collection-search" v-model="search" type="search" class="input !pl-9" placeholder="Search this list" />
      </div>
      <span class="ml-auto text-xs font-semibold text-ink-faint">{{ visible.length }} of {{ rows?.length ?? 0 }}</span>
    </div>

    <!-- list -->
    <section class="surface fade-up stagger-1 overflow-hidden">
      <!-- mobile: cards -->
      <ul class="divide-y divide-line sm:hidden">
        <li v-for="row in visible" :key="row.id" class="flex items-start gap-3 p-4">
          <img
            v-if="columns.some((c) => isImage(row, c.key))"
            :src="row[columns.find((c) => isImage(row, c.key))!.key]"
            alt=""
            class="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold text-ink">{{ cell(row, columns[0]!.key) }}</p>
            <dl class="mt-1 space-y-0.5">
              <div v-for="c in columns.slice(1)" :key="c.key" class="flex gap-2 text-xs">
                <dt class="shrink-0 font-semibold text-ink-faint">{{ c.label }}:</dt>
                <dd class="truncate text-ink-soft">{{ isImage(row, c.key) ? 'image' : cell(row, c.key) }}</dd>
              </div>
            </dl>
            <div class="mt-3 flex gap-2">
              <button class="btn-ghost !py-2 !text-xs" @click="startEdit(row)"><Icon name="lucide:pencil" /> Edit</button>
              <button class="btn-ghost !py-2 !text-xs !text-red-600" @click="remove(row)"><Icon name="lucide:trash-2" /> Delete</button>
            </div>
          </div>
        </li>
        <li v-if="!visible.length">
          <AdminEmptyState icon="lucide:inbox" :title="search ? 'No matches' : 'Nothing here yet'" :body="search ? 'Try a different search term.' : emptyText">
            <template v-if="!search" #action><button class="btn-primary !py-2.5" @click="startNew">Add the first one</button></template>
          </AdminEmptyState>
        </li>
      </ul>

      <!-- desktop: table -->
      <div class="table-wrap hidden sm:block">
        <table class="console-table">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c.key" scope="col">{{ c.label }}</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visible" :key="row.id" :class="editing?.id === row.id ? 'bg-brand-50' : ''">
              <td v-for="(c, ci) in columns" :key="c.key" :class="ci === 0 ? 'font-semibold text-ink' : 'text-ink-soft'">
                <img v-if="isImage(row, c.key)" :src="row[c.key]" alt="" class="h-10 w-10 rounded-lg border border-line object-cover" />
                <template v-else>{{ cell(row, c.key) }}</template>
              </td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn-sm icon-btn-brand" aria-label="Edit item" title="Edit" @click="startEdit(row)">
                    <Icon name="lucide:pencil" />
                  </button>
                  <button class="icon-btn-sm icon-btn-danger" aria-label="Delete item" title="Delete" @click="remove(row)">
                    <Icon name="lucide:trash-2" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!visible.length">
              <td :colspan="columns.length + 1" class="!p-0">
                <AdminEmptyState
                  :icon="icon ?? 'lucide:inbox'"
                  :title="search ? 'No matches' : 'Nothing here yet'"
                  :body="search ? 'Try a different search term.' : (emptyText ?? 'Add the first item to see it on the public site.')"
                >
                  <template v-if="!search" #action>
                    <button class="btn-primary !py-2.5" @click="startNew"><Icon name="lucide:plus" /> {{ newLabel ?? 'Add the first one' }}</button>
                  </template>
                </AdminEmptyState>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
