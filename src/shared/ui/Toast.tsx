import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { cx } from '../lib/cx'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 4500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const icons = {
    success: <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />,
    error: <AlertCircle className="size-5 shrink-0 text-rose-600" />,
    info: <Info className="size-5 shrink-0 text-brand" />,
  }

  const styles = {
    success: 'border-emerald-300 bg-white text-emerald-950 shadow-lg shadow-emerald-950/10',
    error: 'border-rose-400 bg-rose-50 text-rose-950 shadow-xl shadow-rose-950/15 ring-1 ring-rose-300',
    info: 'border-brand/30 bg-white text-ink shadow-lg shadow-ink/10',
  }

  return (
    <div
      className={cx(
        'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3',
        styles[toast.type],
      )}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-xs leading-snug opacity-90 break-words">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
        aria-label="Закрыть уведомление"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}


