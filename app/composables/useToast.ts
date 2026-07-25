// Global toast queue. Mounted once by <AdminToaster> in the admin layout.

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  body?: string
  timeout: number
}

let seq = 0

export function useToast() {
  const toasts = useState<Toast[]>('console-toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(tone: ToastTone, title: string, body?: string, timeout = tone === 'error' ? 6000 : 3500) {
    const id = ++seq
    toasts.value = [...toasts.value, { id, tone, title, body, timeout }]
    if (import.meta.client && timeout > 0) setTimeout(() => dismiss(id), timeout)
    return id
  }

  return {
    toasts,
    dismiss,
    success: (title: string, body?: string) => push('success', title, body),
    error: (title: string, body?: string) => push('error', title, body),
    info: (title: string, body?: string) => push('info', title, body),
  }
}
