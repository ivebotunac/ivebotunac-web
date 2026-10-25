import { ref, readonly } from 'vue'

export type PnToastKind = 'success' | 'error' | 'info'

export interface PnToast {
  id: number
  kind: PnToastKind
  message: string
  // Milliseconds before auto-dismiss; 0 keeps the toast until dismissed.
  duration: number
}

export interface PnToastOptions {
  duration?: number
}

interface ToastTimer {
  handle: ReturnType<typeof setTimeout> | null
  remaining: number
  startedAt: number
}

const MAX_VISIBLE = 3
const DEFAULT_DURATION: Record<PnToastKind, number> = {
  success: 3500,
  info: 3500,
  error: 6000
}

// One module-level queue, rendered once by PnToaster; pushed only on the client, so safe under SSR.
const toasts = ref<PnToast[]>([])
const timers = new Map<number, ToastTimer>()
let nextId = 1

function clearTimer(id: number) {
  const t = timers.get(id)
  if (t?.handle) clearTimeout(t.handle)
  timers.delete(id)
}

function dismiss(id: number) {
  clearTimer(id)
  const i = toasts.value.findIndex((t) => t.id === id)
  if (i !== -1) toasts.value.splice(i, 1)
}

function startTimer(id: number, remaining: number) {
  const t = timers.get(id)
  if (!t || remaining <= 0) return
  t.remaining = remaining
  t.startedAt = Date.now()
  t.handle = setTimeout(() => dismiss(id), remaining)
}

// Freeze the countdown while the pointer or focus is on the toast.
function pause(id: number) {
  const t = timers.get(id)
  if (!t?.handle) return
  clearTimeout(t.handle)
  t.handle = null
  t.remaining = Math.max(0, t.remaining - (Date.now() - t.startedAt))
}

function resume(id: number) {
  const t = timers.get(id)
  if (!t || t.handle) return
  // Give a paused toast at least a beat before it leaves.
  startTimer(id, Math.max(t.remaining, 800))
}

function push(kind: PnToastKind, message: string, options?: PnToastOptions): number {
  const id = nextId++
  const duration = options?.duration ?? DEFAULT_DURATION[kind]
  toasts.value.push({ id, kind, message, duration })

  // Oldest drops when a fourth arrives.
  while (toasts.value.length > MAX_VISIBLE) {
    const oldest = toasts.value[0]
    if (oldest) dismiss(oldest.id)
  }

  if (typeof window !== 'undefined' && duration > 0) {
    timers.set(id, { handle: null, remaining: duration, startedAt: Date.now() })
    startTimer(id, duration)
  }
  return id
}

export const toast = {
  success: (message: string, options?: PnToastOptions) => push('success', message, options),
  error: (message: string, options?: PnToastOptions) => push('error', message, options),
  info: (message: string, options?: PnToastOptions) => push('info', message, options),
  dismiss
}

export function usePnToast() {
  return {
    toasts: readonly(toasts),
    toast,
    dismiss,
    pause,
    resume
  }
}
