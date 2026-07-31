<script setup lang="ts">
// Read-only display of a team's custom application answers, embedded in the
// registrations list's expanded row next to AdminTeamManager.
const props = defineProps<{ registrationId: number }>()

interface Answer { id: number; label: string; fieldType: 'text' | 'file'; textValue: string | null; fileUrl: string | null; fileName: string | null }

const { data, pending } = await useFetch<Answer[]>(`/api/admin/registrations/${props.registrationId}/application`)
</script>

<template>
  <div v-if="pending" class="text-xs text-ink-faint">Loading application…</div>
  <div v-else-if="data?.length" class="rounded-xl border border-line bg-white p-4">
    <p class="console-label">Application</p>
    <dl class="mt-3 space-y-2.5">
      <div v-for="a in data" :key="a.id">
        <dt class="text-xs font-bold text-ink-faint">{{ a.label }}</dt>
        <dd class="mt-0.5 text-sm text-ink">
          <a v-if="a.fileUrl" :href="a.fileUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline">
            <Icon name="lucide:paperclip" /> {{ a.fileName || 'View file' }}
          </a>
          <span v-else-if="a.textValue">{{ a.textValue }}</span>
          <span v-else class="text-ink-faint">Not answered</span>
        </dd>
      </div>
    </dl>
  </div>
</template>
