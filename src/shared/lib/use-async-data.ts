/**
 * Минимальная загрузка данных: loading | error | ready. Без библиотек состояния —
 * у карты три независимых источника (границы, риск зон, отчёты), и упавший источник
 * не должен ронять всю карту: каждый показывает свою ошибку.
 *
 * `load` обязан быть стабильным (useCallback у вызывающего): он — единственная зависимость.
 */
import { useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

const FALLBACK_MESSAGE = 'Не удалось загрузить данные'

export function useAsyncData<T>(load: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error && error.message ? error.message : FALLBACK_MESSAGE,
        })
      },
    )

    return () => controller.abort()
  }, [load])

  return state
}