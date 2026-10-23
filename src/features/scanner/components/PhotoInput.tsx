import { Camera, ImagePlus } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/ui/Button'

type PhotoInputProps = {
  disabled?: boolean
  onPick: (file: File) => void
}

/**
 * Два входа в камеру/галерею: атрибут capture="environment" открывает сразу
 * заднюю камеру, без него — галерею. Кнопки ≥ 48 px (Button size lg).
 */
export function PhotoInput({ disabled = false, onPick }: PhotoInputProps) {
  const { t } = useTranslation()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Сбрасываем значение: иначе повторный выбор того же файла не вызовет change.
    event.target.value = ''
    if (file) onPick(file)
  }

  return (
    <div className="space-y-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <Button className="w-full" disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <Camera aria-hidden className="size-5" strokeWidth={2.25} />
        {t('scan.takePhoto')}
      </Button>

      <Button
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
      >
        <ImagePlus aria-hidden className="size-5" strokeWidth={2.25} />
        {t('scan.fromGallery')}
      </Button>
    </div>
  )
}