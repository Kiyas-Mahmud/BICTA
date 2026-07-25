<script setup lang="ts">
// Renders whatever useConfirm() is currently asking. Escape cancels, the
// confirm button takes focus on open, and the backdrop click cancels too.
const { state, answer } = useConfirm()

const panel = ref<HTMLElement | null>(null)
const confirmBtn = ref<HTMLButtonElement | null>(null)

watch(
  () => state.value.open,
  async (open) => {
    if (!open) return
    await nextTick()
    confirmBtn.value?.focus()
  },
)

function onKeydown(e: KeyboardEvent) {
  if (!state.value.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    answer(false)
    return
  }
  // Keep focus inside the dialog while it is open.
  if (e.key === 'Tab' && panel.value) {
    const items = panel.value.querySelectorAll<HTMLElement>('button')
    if (!items.length) return
    const first = items[0]!
    const last = items[items.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="dlg">
    <div
      v-if="state.open"
      class="fixed inset-0 z-[110] flex items-end justify-center bg-ink/45 p-4 backdrop-blur-sm sm:items-center"
      @click.self="answer(false)"
    >
      <div ref="panel" class="dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="flex items-start gap-3.5">
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
            :class="state.tone === 'brand' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'"
          >
            <Icon :name="state.icon ?? (state.tone === 'brand' ? 'lucide:circle-help' : 'lucide:triangle-alert')" />
          </span>
          <div class="min-w-0">
            <h2 id="confirm-title" class="text-base font-bold text-ink">{{ state.title }}</h2>
            <p v-if="state.body" class="mt-1.5 text-sm leading-relaxed text-ink-soft">{{ state.body }}</p>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" class="btn-ghost sm:min-w-[7rem]" @click="answer(false)">
            {{ state.cancelLabel ?? 'Cancel' }}
          </button>
          <button
            ref="confirmBtn"
            type="button"
            class="sm:min-w-[7rem]"
            :class="state.tone === 'brand' ? 'btn-primary !py-2.5' : 'btn-danger'"
            @click="answer(true)"
          >
            {{ state.confirmLabel ?? 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
