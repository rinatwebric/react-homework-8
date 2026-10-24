/**
 * Разбор и проверка запроса Edge Functions.
 * `sha256Hex` — единственный оставшийся помощник: `submit-report` хэширует IP
 * для лимита частоты (сам адрес не хранится, только хэш с «перцем»).
 */

/** SHA-256 содержимого в hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function readPhotoRequest(request: Request): Promise<PhotoRequest> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('INVALID_INPUT', 400, 'Ожидается multipart/form-data с полем file')
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new ApiError('INVALID_INPUT', 400, 'Не удалось разобрать форму')
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    throw new ApiError('INVALID_INPUT', 400, 'В поле file нет изображения')
  }
  if (file.size === 0) {
    throw new ApiError('INVALID_INPUT', 400, 'Пустой файл')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError('FILE_TOO_LARGE', 413, 'Файл больше 2 МБ — сожмите фото на клиенте')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = detectImageMime(bytes)
  if (!mime) {
    throw new ApiError('UNSUPPORTED_MEDIA', 415, 'Поддерживаются JPEG, PNG и WebP')
  }

  return {
    clientId: parseClientId(form.get('client_id')),
    lang: parseLang(form.get('lang')),
    mode: parseMode(form.get('mode')),
    bytes,
    mime,
  }
}