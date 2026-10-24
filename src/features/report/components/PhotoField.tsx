import { Camera, Check, Loader2, Trash2, Upload } from 'lucide-react'
import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { compressImageToJpeg } from '../../../shared/lib/image-compress'
import { uploadReportPhoto } from '../../../shared/lib/storage'
import { Card } from '../../../shared/ui/Card'

type PhotoFieldProps = {
  clientId: string
  photoPath: string | null
  onChange: (path: string | null) => void
}

export function PhotoField({ clientId, photoPath, onChange }: PhotoFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setError(null)
      setUploading(true)

      try {
        // 1. Сжимаем через Canvas (удаляет EXIF, масштабирует ≤1280px, сжимает в JPEG)
        const compressedBlob = await compressImageToJpeg(file)
        const localPreview = URL.createObjectURL(compressedBlob)
        setPreviewUrl(localPreview)

        // 2. Загружаем в Supabase Storage в папку clientId
        const uploadedPath = await uploadReportPhoto(clientId, compressedBlob)
        onChange(uploadedPath)
      } catch (err) {
        console.error('[photo] ошибка обработки/загрузки:', err)
        setError(t('report.photo.error'))
        onChange(null)
        setPreviewUrl(null)
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [clientId, onChange, t],
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setPreviewUrl(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [onChange])

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          {t('report.photo.title')}
        </label>
        <span className="text-xs text-muted-foreground">{t('report.optional')}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="report-photo-input"
        disabled={uploading}
      />

      {photoPath || previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Превью проблемы"
              className="size-16 shrink-0 rounded-md object-cover border border-border"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Camera className="size-6" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
              <Check className="size-3.5 stroke-[2.5]" />
              {t('report.photo.attached')}
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {t('report.photo.attachedHint')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={t('report.photo.remove')}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-brand/60 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin text-brand" />
                <span>{t('report.photo.uploading')}</span>
              </>
            ) : (
              <>
                <Camera className="size-4 text-brand" />
                <Upload className="size-4 text-muted-foreground" />
                <span>{t('report.photo.attachButton')}</span>
              </>
            )}
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {t('report.photo.privacyWarning')}
          </p>
        </div>
      )}

      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </Card>
  )
}
