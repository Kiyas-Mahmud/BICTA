<script setup lang="ts">
// Broadcast mail: compose an announcement in admin and send it to newsletter
// subscribers, every registered participant, or a hand-typed list -- from the
// site's own address, branded with the current logo and organisation name
// (server/utils/email.ts broadcastEmail()). Main-admin only: a mass send to
// real people carries deliverability/reputation risk on par with settings.
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Campaign {
  id: number
  subject: string
  audience: 'newsletter' | 'participants' | 'custom'
  recipientCount: number
  sentCount: number
  failedCount: number
  sentByName: string
  createdAt: string
}

const toast = useToast()
const { confirm } = useConfirm()

const { data: counts } = await useFetch<{ newsletter: number; participants: number }>('/api/admin/mailer/audience-counts')
const { data: campaigns, refresh: refreshCampaigns } = await useFetch<Campaign[]>('/api/admin/mailer/campaigns')

const audience = ref<'newsletter' | 'participants' | 'custom'>('newsletter')
const subject = ref('')
const message = ref('')
const customEmailsRaw = ref('')
const sending = ref(false)

// Free-typed list: commas, newlines or plain whitespace between addresses all
// work, since that is how people actually paste a list out of a spreadsheet
// or another mail client.
const customEmails = computed(() =>
  [...new Set(
    customEmailsRaw.value
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  )],
)

const recipientCount = computed(() => {
  if (audience.value === 'newsletter') return counts.value?.newsletter ?? 0
  if (audience.value === 'participants') return counts.value?.participants ?? 0
  return customEmails.value.length
})

const AUDIENCE_LABEL: Record<Campaign['audience'], string> = {
  newsletter: 'Newsletter subscribers',
  participants: 'All participants',
  custom: 'Custom list',
}

const canSend = computed(() => subject.value.trim().length >= 3 && message.value.trim().length > 0 && recipientCount.value > 0)

async function send() {
  if (!canSend.value) return

  const ok = await confirm({
    title: 'Send this email now?',
    body: `This goes out immediately to ${recipientCount.value} ${recipientCount.value === 1 ? 'address' : 'addresses'} (${AUDIENCE_LABEL[audience.value]}). There is no undo.`,
    confirmLabel: 'Send now',
    tone: 'brand',
  })
  if (!ok) return

  sending.value = true
  try {
    const campaign = await $fetch('/api/admin/mailer/send', {
      method: 'POST',
      body: {
        subject: subject.value,
        message: message.value,
        audience: audience.value,
        customEmails: audience.value === 'custom' ? customEmails.value : undefined,
      },
    })
    toast.success(
      campaign.failedCount > 0
        ? `Sent to ${campaign.sentCount} of ${campaign.recipientCount} -- ${campaign.failedCount} failed`
        : `Sent to all ${campaign.sentCount} recipients`,
    )
    subject.value = ''
    message.value = ''
    customEmailsRaw.value = ''
    await refreshCampaigns()
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Could not send that email')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <AdminPageHeader
      title="Send mail"
      subtitle="Compose an announcement and send it from your own site, with your logo and organisation name."
      icon="lucide:send"
    />

    <form class="grid gap-6 xl:grid-cols-[1fr_20rem] xl:items-start" @submit.prevent="send">
      <div class="min-w-0 space-y-5">
        <div>
          <label class="label" for="ml-subject">Subject <span class="text-red-600">*</span></label>
          <input
            id="ml-subject"
            v-model="subject"
            class="input !py-3 !text-base font-bold"
            required
            maxlength="150"
            placeholder="Registration for BICTA 2026 is now open"
          />
        </div>
        <div>
          <label class="label">Message</label>
          <AdminRichText v-model="message" />
        </div>
      </div>

      <aside class="space-y-5 xl:sticky xl:top-24">
        <div class="surface-quiet p-4">
          <h3 class="console-h2 mb-3">Recipients</h3>
          <div class="space-y-4">
            <div>
              <label class="label" for="ml-audience">Audience</label>
              <select id="ml-audience" v-model="audience" class="input !bg-white">
                <option value="newsletter">Newsletter subscribers ({{ counts?.newsletter ?? 0 }})</option>
                <option value="participants">All participants ({{ counts?.participants ?? 0 }})</option>
                <option value="custom">Custom list</option>
              </select>
            </div>
            <div v-if="audience === 'custom'">
              <label class="label" for="ml-custom">Email addresses</label>
              <textarea
                id="ml-custom"
                v-model="customEmailsRaw"
                class="input"
                rows="4"
                placeholder="one@example.com, two@example.com"
              />
              <p class="mt-1 text-xs text-ink-faint">Separate with commas, spaces or new lines.</p>
            </div>
            <div class="rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-bold text-brand-700">
              <Icon name="lucide:users" class="mr-1.5" />{{ recipientCount }} {{ recipientCount === 1 ? 'recipient' : 'recipients' }}
            </div>
          </div>
        </div>

        <AdminFormActions :saving="sending" label="Send now" :disabled="!canSend" />
      </aside>
    </form>

    <section class="surface fade-up overflow-hidden">
      <div class="border-b border-line p-4 sm:p-5">
        <h3 class="console-h2">Sent</h3>
      </div>
      <div class="table-wrap">
        <table class="console-table min-w-[36rem]">
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Audience</th>
              <th scope="col">Delivered</th>
              <th scope="col">Sent by</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td class="font-semibold text-ink">{{ c.subject }}</td>
              <td><span class="badge badge-blue">{{ AUDIENCE_LABEL[c.audience] }}</span></td>
              <td>
                <span class="badge" :class="c.failedCount > 0 ? 'badge-amber' : 'badge-green'">
                  {{ c.sentCount }}/{{ c.recipientCount }}
                </span>
              </td>
              <td class="text-ink-soft">{{ c.sentByName }}</td>
              <td class="whitespace-nowrap text-ink-soft">{{ formatDay(c.createdAt) }}</td>
            </tr>
            <tr v-if="!campaigns?.length">
              <td colspan="5" class="!p-0">
                <AdminEmptyState icon="lucide:send" title="Nothing sent yet" body="Emails you send from this page appear here." />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
