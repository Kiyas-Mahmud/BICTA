<script setup lang="ts">
// Single mount point for the toast queue (admin layout + scanner).
const { toasts, dismiss } = useToast()

const glyph: Record<string, { icon: string; cls: string }> = {
  success: { icon: 'lucide:check', cls: 'bg-green-50 text-green-700' },
  error: { icon: 'lucide:triangle-alert', cls: 'bg-red-50 text-red-600' },
  info: { icon: 'lucide:info', cls: 'bg-brand-50 text-brand-700' },
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:px-0"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast">
        <span class="toast-glyph" :class="glyph[t.tone]?.cls"><Icon :name="glyph[t.tone]?.icon ?? 'lucide:info'" /></span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-ink">{{ t.title }}</p>
          <p v-if="t.body" class="mt-0.5 text-xs leading-relaxed text-ink-soft">{{ t.body }}</p>
        </div>
        <button class="icon-btn-sm -mr-1 -mt-1 h-7 w-7" aria-label="Dismiss notification" @click="dismiss(t.id)">
          <Icon name="lucide:x" class="text-sm" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
