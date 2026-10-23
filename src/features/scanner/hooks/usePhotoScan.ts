import { useCallback, useEffect, useRef, useState } from 'react'
import { features } from '../../../config/features'
import {
  AnalyzeError,
  analyzePhoto,
  type AnalyzeResult,
} from '../lib/analyze-photo'
import { createClientId } from '../lib/client-id'
import { compressPhoto } from '../lib/compress'
import { checkPhoto, type PhotoProblem } from '../lib/photo-file'

export type ScanStep = 'compressing' | 'analyzing'

export type ScanState =
  | { status: 'idle' }
  | { status: 'working'; previewUrl: string; step: ScanStep }
  | { status: 'done'; previewUrl: string; result: AnalyzeResult }
  | { status: 'failed'; previewUrl: string | null; error: AnalyzeError }

export type StartOutcome = { ok: true } | { ok: false; problem: PhotoProblem }

/**
 * Состояние сканера: файл → сжатие на телефоне → analyze-photo → результат.
 * runId отсекает «догоняющие» ответы, если пользователь снял новое фото,
 * пока предыдущее ещё обрабатывалось.
 */
export function usePhotoScan() {
  const [state, setState] = useState<ScanState>({ status: 'idle' })
  const [clientId] = useState(createClientId)
  const previewRef = useRef<string | null>(null)
  const runIdRef = useRef(0)

  const releasePreview = useCallback(() => {
    if (!previewRef.current) return
    URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
  }, [])

  useEffect(() => () => releasePreview(), [releasePreview])

  const reset = useCallback(() => {
    runIdRef.current += 1
    releasePreview()
    setState({ status: 'idle' })
  }, [releasePreview])

  const start = useCallback(
    async (file: File): Promise<StartOutcome> => {
      const problem = checkPhoto(file)
      if (problem) return { ok: false, problem }

      runIdRef.current += 1
      const runId = runIdRef.current

      releasePreview()
      const previewUrl = URL.createObjectURL(file)
      previewRef.current = previewUrl
      setState({ status: 'working', previewUrl, step: 'compressing' })

      try {
        const compressed = await compressPhoto(file)
        if (runId !== runIdRef.current) return { ok: true }

        setState({ status: 'working', previewUrl, step: 'analyzing' })
        // Язык подсказок модели = язык интерфейса. Кыргызский включается флагом,
        // пока нет перевода интерфейса (src/locales/ky.json пуст).
        const lang = features.kyrgyz ? 'ky' : 'ru'
        const mode = features.farmer ? 'farmer' : 'resident'
        const result = await analyzePhoto({ file: compressed, clientId, lang, mode })
        if (runId !== runIdRef.current) return { ok: true }

        setState({ status: 'done', previewUrl, result })
        return { ok: true }
      } catch (error) {
        if (runId !== runIdRef.current) return { ok: true }

        const analyzeError =
          error instanceof AnalyzeError
            ? error
            : new AnalyzeError('SERVER', 'Не удалось получить оценку')
        setState({ status: 'failed', previewUrl, error: analyzeError })
        return { ok: true }
      }
    },
    [clientId, releasePreview],
  )

  return { state, start, reset }
}