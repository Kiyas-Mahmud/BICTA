// Promise-based confirmation dialog, replacing window.confirm() so destructive
// actions get a real, accessible, on-brand prompt. Rendered once by
// <AdminConfirmDialog> in the admin layout.

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'brand'
  icon?: string
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (ok: boolean) => void
}

export function useConfirm() {
  const state = useState<ConfirmState>('console-confirm', () => ({ open: false, title: '' }))

  function confirm(options: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      state.value = { ...options, open: true, resolve }
    })
  }

  function answer(ok: boolean) {
    state.value.resolve?.(ok)
    state.value = { ...state.value, open: false, resolve: undefined }
  }

  return { state, confirm, answer }
}
