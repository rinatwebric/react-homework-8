import { useState } from 'react'
import type { ToastItem, ToastType } from './Toast'

/** Простой хук для управления toast-уведомлениями */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, type, title, message }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toasts,
    addToast,
    dismissToast,
    showSuccess: (title: string, message?: string) => addToast('success', title, message),
    showError: (title: string, message?: string) => addToast('error', title, message),
    showInfo: (title: string, message?: string) => addToast('info', title, message),
  }
}
