<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Message {
  id: number
  name: string
  email: string
  subject: string
  message: string
  isRead: boolean
  createdAt: string
}

const { data: messages, refresh } = await useFetch<Message[]>('/api/admin/contact-messages')
const expanded = ref<number | null>(null)
const toast = useToast()
const { confirm } = useConfirm()

async function toggleRead(m: Message) {
  await $fetch(`/api/admin/contact-messages/${m.id}`, { method: 'PUT', body: { isRead: !m.isRead } })
  await refresh()
}

async function remove(m: Message) {
  const ok = await confirm({
    title: `Delete message from ${m.name}?`,
    body: 'The enquiry is removed permanently. Reply by email first if you still need to.',
  })
  if (!ok) return
  await $fetch(`/api/admin/contact-messages/${m.id}`, { method: 'DELETE' })
  await refresh()
  toast.success('Message deleted')
}

// Opening a message marks it read, the way an inbox is expected to behave.
async function open(m: Message) {
  const isOpening = expanded.value !== m.id
  expanded.value = isOpening ? m.id : null
  if (isOpening && !m.isRead) await toggleRead(m)
}

const unread = computed(() => messages.value?.filter((m) => !m.isRead).length ?? 0)

const filter = ref('all')
const search = ref('')
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (messages.value ?? []).filter((m) => {
    const byState = filter.value === 'all' || (filter.value === 'unread' ? !m.isRead : m.isRead)
    const byText = !q || [m.name, m.email, m.subject, m.message].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    return byState && byText
  })
})
const filters = computed(() => [
  { value: 'all', label: 'All', count: messages?.value?.length ?? 0 },
  { value: 'unread', label: 'Unread', count: unread.value },
  { value: 'read', label: 'Read', count: (messages.value?.length ?? 0) - unread.value },
])

function preview(text: string) {
  return text.length > 90 ? `${text.slice(0, 90)}…` : text
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader title="Contact messages" subtitle="Enquiries submitted from the public contact form." icon="lucide:inbox">
      <template #badge>
        <span v-if="unread" class="status status-brand">{{ unread }} unread</span>
      </template>
    </AdminPageHeader>

    <div class="toolbar fade-up stagger-1">
      <AdminSegmented v-model="filter" :options="filters" aria-label="Filter messages" />
      <div class="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <label class="sr-only" for="msg-search">Search messages</label>
        <input id="msg-search" v-model="search" type="search" class="input !pl-9" placeholder="Search sender or text" />
      </div>
    </div>

    <section class="surface fade-up stagger-2 overflow-hidden">
      <ul class="divide-y divide-line">
        <li
          v-for="m in visible"
          :key="m.id"
          class="transition-colors"
          :class="[m.isRead ? '' : 'bg-brand-50/50', expanded === m.id ? 'bg-brand-50' : 'hover:bg-mist-1']"
        >
          <div class="flex items-start gap-3 p-4 sm:items-center sm:px-5">
            <span v-if="!m.isRead" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600 sm:mt-0" aria-label="Unread" />
            <span v-else class="mt-2 h-2 w-2 shrink-0 sm:mt-0" aria-hidden="true" />

            <AdminAvatar :name="m.name" />

            <button
              class="min-w-0 flex-1 rounded-lg text-left"
              :aria-expanded="expanded === m.id"
              @click="open(m)"
            >
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span class="truncate text-ink" :class="m.isRead ? 'font-semibold' : 'font-extrabold'">{{ m.name }}</span>
                <span class="truncate text-xs text-ink-faint">{{ m.email }}</span>
              </span>
              <span class="mt-0.5 block truncate text-sm text-ink-soft">
                <span class="font-semibold text-ink">{{ m.subject || 'No subject' }}</span>
                <span class="text-ink-faint"> — {{ preview(m.message) }}</span>
              </span>
            </button>

            <span class="hidden shrink-0 whitespace-nowrap text-xs text-ink-faint sm:block">{{ timeAgo(m.createdAt) }}</span>

            <div class="row-actions shrink-0">
              <button class="icon-btn-sm icon-btn-brand" :aria-label="m.isRead ? `Mark message from ${m.name} unread` : `Mark message from ${m.name} read`" :title="m.isRead ? 'Mark unread' : 'Mark read'" @click="toggleRead(m)">
                <Icon :name="m.isRead ? 'lucide:mail' : 'lucide:mail-open'" />
              </button>
              <button class="icon-btn-sm icon-btn-danger" :aria-label="`Delete message from ${m.name}`" title="Delete" @click="remove(m)">
                <Icon name="lucide:trash-2" />
              </button>
            </div>
          </div>

          <Transition name="row">
            <div v-if="expanded === m.id" class="border-t border-line bg-white px-4 py-4 sm:px-5 sm:pl-[4.6rem]">
              <p class="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{{ m.message }}</p>
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <a :href="`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message to BICTA'))}`" class="btn-ghost !py-2">
                  <Icon name="lucide:reply" /> Reply by email
                </a>
                <span class="text-xs text-ink-faint">Received {{ formatDay(m.createdAt, { dateStyle: 'medium' }) }}</span>
              </div>
            </div>
          </Transition>
        </li>

        <li v-if="!visible.length">
          <AdminEmptyState
            icon="lucide:inbox"
            :title="messages?.length ? 'Nothing matches this view' : 'No messages yet'"
            :body="messages?.length ? 'Try another filter or search term.' : 'Enquiries from the public contact form land here.'"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
