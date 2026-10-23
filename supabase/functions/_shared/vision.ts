/**
 * Клиент vision-модели (Gemini, REST generateContent).
 *
 * Ключ и имя модели — только в секретах функции: VISION_API_KEY, VISION_MODEL.
 * Модель читается из переменной, чтобы смена её идентификатора не требовала правок кода.
 *
 * Надёжность: просим JSON через responseMimeType + responseSchema; если провайдер
 * не принял схему или вернул невалидный JSON — один повтор без схемы (промпт всё равно
 * требует строгий JSON), затем 502 AI_INVALID. Валидация — zod, второй линией.
 */
import { assessmentSchema, normalizeAssessment, type Assessment } from './ai-contract.ts'
import { ApiError } from './errors.ts'
import { buildSystemInstruction, buildUserPrompt } from './prompt.ts'
import type { AppLang, ImageMime, ScanMode } from './request.ts'

/**
 * Дефолт, если VISION_MODEL не задан. Меняется секретом, без правок кода.
 * `gemini-2.5-flash` закрыт для новых ключей (404 «no longer available»), а
 * `gemini-3.5-flash` часто отвечает 503 «high demand» — поэтому lite: на демо
 * отвечает за 1–3 с и держит JSON-схему.
 */
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
/** Резерв, если основная модель перегружена (5xx) или исчезла (404). */
const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
/** Таймаут одного запроса к модели: дольше 25 с житель не ждёт. */
const REQUEST_TIMEOUT_MS = 25_000

export type VisionInput = {
  bytes: Uint8Array
  mimeType: ImageMime
  lang: AppLang
  mode: ScanMode
}

export type VisionOutput = {
  assessment: Assessment
  model: string
  /** false — модель ответила без responseSchema (сработал повтор). */
  schemaUsed: boolean
}

type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  promptFeedback?: { blockReason?: string }
}

function responseSchema(mode: ScanMode): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    is_relevant: {
      type: 'BOOLEAN',
      description: 'true, если на фото стена, потолок, пол, подвал или участок у дома',
    },
    risk_level: {
      type: 'STRING',
      enum: ['low', 'medium', 'high'],
      description: 'Видимые признаки сырости: low — нет, medium — пятна, high — явная вода',
    },
    confidence: { type: 'NUMBER', description: 'Уверенность 0…1 с учётом качества снимка' },
    findings: { type: 'ARRAY', items: { type: 'STRING' }, description: '1–4 факта с фото' },
    recommendations: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '1–3 действия жителя',
    },
    disclaimer: { type: 'STRING', description: 'Одна фраза: оценка по фото, не измерение' },
  }

  if (mode === 'farmer') {
    properties.water_tips = {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '1–3 совета по воде на участке',
    }
  }

  return {
    type: 'OBJECT',
    properties,
    required: [
      'is_relevant',
      'risk_level',
      'confidence',
      'findings',
      'recommendations',
      'disclaimer',
    ],
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function buildBody(input: VisionInput, withSchema: boolean): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: buildSystemInstruction(input.lang, input.mode) }] },
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildUserPrompt(input.lang, input.mode) },
          { inlineData: { mimeType: input.mimeType, data: toBase64(input.bytes) } },
        ],
      },
    ],
    generationConfig: {
      // Низкая температура: нужна стабильная оценка, а не текстовое разнообразие.
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      ...(withSchema ? { responseSchema: responseSchema(input.mode) } : {}),
    },
  }
}

/** Снимает markdown-обёртку, если модель всё-таки добавила ```json. */
function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  return JSON.parse(cleaned)
}
function readConfig(): { apiKey: string; models: string[] } {
  const apiKey = Deno.env.get('VISION_API_KEY')?.trim()
  if (!apiKey) {
    throw new ApiError('NOT_CONFIGURED', 503, 'VISION_API_KEY не задан в секретах функции')
  }
  const primary = (Deno.env.get('VISION_MODEL')?.trim() || DEFAULT_MODEL).replace(/^models\//, '')
  const fallback = (Deno.env.get('VISION_MODEL_FALLBACK')?.trim() || DEFAULT_FALLBACK_MODEL).replace(
    /^models\//,
    '',
  )
  // Резерв имеет смысл только если он отличается от основной модели.
  return { apiKey, models: fallback && fallback !== primary ? [primary, fallback] : [primary] }
}

/** Модель перегружена или исчезла — можно молча переключиться на резервную. */
class ModelUnavailable extends ApiError {
  constructor(message: string) {
    super('SERVER', 502, message)
    this.name = 'ModelUnavailable'
  }
}

type ModelResponse =
  | { kind: 'ok'; payload: GeminiPayload }
  | { kind: 'rejected'; status: number; details: string }

async function requestModel(
  model: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<ModelResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      // Тело ошибки полезно в логах и не содержит ключа — только текст провайдера.
      const details = (await response.text()).slice(0, 500)
      console.error(`[analyze-photo] модель ${model} ответила ${response.status}: ${details}`)
      if (response.status === 429) {
        throw new ApiError('RATE_LIMITED', 429, 'Модель перегружена, попробуйте через минуту')
      }
      if (response.status === 404) {
        // Модель снята с обслуживания или закрыта для новых ключей — идём в резерв.
        throw new ModelUnavailable('Модель недоступна (404)')
      }
      if (response.status >= 500) {
        throw new ModelUnavailable(`Модель недоступна (${response.status})`)
      }
      return { kind: 'rejected', status: response.status, details }
    }

    return { kind: 'ok', payload: (await response.json()) as GeminiPayload }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('AI_TIMEOUT', 504, 'Модель не ответила за 25 секунд')
    }
    console.error(
      `[analyze-photo] сеть недоступна: ${error instanceof Error ? error.message : String(error)}`,
    )
    throw new ApiError('SERVER', 502, 'Не удалось связаться с моделью')
  } finally {
    clearTimeout(timer)
  }
}

/** Одна модель: до двух вызовов (со схемой и без). */
async function assessWithModel(
  model: string,
  apiKey: string,
  input: VisionInput,
): Promise<VisionOutput> {
  let lastProblem = ''

  // Попытка 1 — со схемой ответа; попытка 2 — без схемы (если провайдер её не принял
  // или первый ответ оказался невалидным JSON). Больше двух вызовов модели на фото не делаем.
  for (const schemaUsed of [true, false]) {
    const response = await requestModel(model, apiKey, buildBody(input, schemaUsed))

    if (response.kind === 'rejected') {
      if (schemaUsed && response.status === 400) {
        console.error('[analyze-photo] responseSchema отклонена, повтор без схемы')
        continue
      }
      throw new ApiError('SERVER', 502, `Модель отклонила запрос (${response.status})`)
    }

    const text = (response.payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()

    if (!text) {
      lastProblem = response.payload.promptFeedback?.blockReason ?? 'пустой ответ модели'
      console.error(`[analyze-photo] пустой ответ: ${lastProblem}`)
      continue
    }

    try {
      const parsed = assessmentSchema.safeParse(extractJson(text))
      if (!parsed.success) {
        lastProblem = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
        console.error(`[analyze-photo] ответ не прошёл zod: ${lastProblem}`)
        continue
      }
      return { assessment: normalizeAssessment(parsed.data), model, schemaUsed }
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error)
      console.error(`[analyze-photo] JSON не разобран: ${lastProblem}`)
    }
  }

  throw new ApiError('AI_INVALID', 502, `Модель не дала валидную оценку (${lastProblem})`)
}

export async function assessPhoto(input: VisionInput): Promise<VisionOutput> {
  const { apiKey, models } = readConfig()
  let lastError: unknown = null

  for (const model of models) {
    try {
      return await assessWithModel(model, apiKey, input)
    } catch (error) {
      // Перегруженная/исчезнувшая модель не должна ломать демо: пробуем резерв.
      if (!(error instanceof ModelUnavailable)) throw error
      console.error(`[analyze-photo] ${model}: ${error.message}, пробуем резервную модель`)
      lastError = error
    }
  }

  throw lastError instanceof ApiError
    ? lastError
    : new ApiError('SERVER', 502, 'Все модели недоступны')
}