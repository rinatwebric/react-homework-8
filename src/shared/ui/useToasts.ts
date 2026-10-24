import { useCallback, useState } from 'react'
import type { ToastItem, ToastType } from './Toast'

/** Простой хук для управления toast-уведомлениями */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    setToasts((prev) => {
      // Защита от спама: не добавляем тост, если такой же уже отображается
      const isDuplicate = prev.some((t) => t.type === type && t.title === title)
      if (isDuplicate) return prev

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      return [...prev.slice(-3), { id, type, title, message }]
    })
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showSuccess = useCallback(
    (title: string, message?: string) => addToast('success', title, message),
    [addToast],
  )
  const showError = useCallback(
    (title: string, message?: string) => addToast('error', title, message),
    [addToast],
  )
  const showInfo = useCallback(
    (title: string, message?: string) => addToast('info', title, message),
    [addToast],
  )

  return {
    toasts,
    addToast,
    dismissToast,
    showSuccess,
    showError,
    showInfo,
  }
}
