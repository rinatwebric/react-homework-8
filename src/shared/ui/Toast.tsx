import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  // Автоматическое исчезновение через 4 секунды
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  // Свайп для закрытия на тачскрине
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    setTouchStartX(touch.clientX)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const touch = e.touches[0]
    if (!touch) return
    const currentX = touch.clientX
    const delta = currentX - touchStartX
    setTouchDeltaX(delta)
  }

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX) > 75) {
      onDismiss(toast.id)
    } else {
      setTouchDeltaX(0)
    }
    setTouchStartX(null)
    setIsSwiping(false)
  }

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

  const opacity = Math.max(0.2, 1 - Math.abs(touchDeltaX) / 200)

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: touchDeltaX ? `translateX(${touchDeltaX}px)` : undefined,
        opacity: touchDeltaX ? opacity : 1,
        transition: isSwiping ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
      }}
      className={cx(
        'pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-2xl border p-4 select-none touch-pan-y',
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
        onClick={() => onDismiss(toast.id)}
        className="rounded-lg p-1 opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
        aria-label="Закрыть уведомление"
      >
        <X className="size-4" />
      </button>

      {/* Индикатор времени жизни тоаста */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 overflow-hidden">
        <div
          className={cx(
            'h-full animate-toast-progress origin-left',
            toast.type === 'success' && 'bg-emerald-500',
            toast.type === 'error' && 'bg-rose-500',
            toast.type === 'info' && 'bg-brand',
          )}
          style={{ animationDuration: '4000ms' }}
        />
      </div>
    </div>
  )
}
