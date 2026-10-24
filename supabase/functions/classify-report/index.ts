import { z } from 'npm:zod@4.6.7'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

// --- CORS & Responses ---
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}

class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status)
  }
  if (error instanceof z.ZodError) {
    const message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return jsonResponse({ error: 'INVALID_INPUT', message }, 400)
  }
  console.error('[classify-report] Непредвиденная ошибка:', error)
  return jsonResponse({ error: 'INTERNAL_ERROR', message: String(error) }, 500)
}

// --- Категории и Срочность (ТЗ v2.0 §7, §8, §12) ---
export const REPORT_CATEGORIES = [
  'basement_water',
  'damp_wall',
  'standing_water',
  'drainage_issue',
  'well_level',
  'road_flooding',
  'other',
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number]

// --- Zod контракты ---
export const TriageSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  urgency: z.enum(URGENCY_LEVELS),
  summary: z.string().min(1).max(200),
  recommended_action: z.string().min(1).max(160),
  duplicate_group: z.string().max(64).nullable(),
  confidence: z.number().min(0).max(1),
  needs_human_review: z.boolean(),
})
export type TriageResult = z.infer<typeof TriageSchema>

export const ClassifyReportRequestSchema = z.object({
  report_id: z.string().uuid(),
  lang: z.enum(['ru', 'ky']).default('ru'),
})
export type ClassifyReportRequest = z.infer<typeof ClassifyReportRequestSchema>

// --- Гео функции (расстояние по формуле гаверсинусов) ---
const EARTH_RADIUS_M = 6_371_000
const toRad = (degrees: number) => (degrees * Math.PI) / 180

function distanceMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

const DUPLICATE_RADIUS_M = 150
const DUPLICATE_WINDOW_DAYS = 14
const GEMINI_MODEL = 'gemini-1.5-flash'

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new ApiError('NOT_CONFIGURED', 503, 'Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Авторизация: service_role, модератор или валидный anon_key проекта */
async function authorizeCaller(request: Request, client: SupabaseClient): Promise<void> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (serviceKey && token === serviceKey) {
    return
  }

  if (anonKey && (token === anonKey || request.headers.get('apikey') === anonKey)) {
    return
  }

  if (token) {
    const { data: { user } } = await client.auth.getUser(token)
    if (user) {
      const { data: mod } = await client
        .from('moderators')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (mod) return
    }
  }

  throw new ApiError('FORBIDDEN', 403, 'Требуются права модератора или сервисный ключ')
}

function areCategoriesRelated(c1: string, c2: string): boolean {
  if (c1 === c2) return true
  const drainageGroup = new Set(['standing_water', 'drainage_issue', 'road_flooding'])
  if (drainageGroup.has(c1) && drainageGroup.has(c2)) return true
  const basementGroup = new Set(['basement_water', 'damp_wall'])
  if (basementGroup.has(c1) && basementGroup.has(c2)) return true
  return false
}

type ReportRecord = {
  id: string
  created_at: string
  category_user: ReportCategory | null
  comment: string | null
  immediate_danger: boolean
  weather_snapshot: {
    temp_c?: number
    precip_mm?: number
    humidity?: number
  } | null
  lat: number | null
  lng: number | null
}

function buildFallbackTriage(
  report: ReportRecord,
  candidateGroup: string | null,
  lang: 'ru' | 'ky',
): TriageResult {
  const category: ReportCategory = report.category_user ?? 'other'
  let urgency: UrgencyLevel = 'low'

  if (report.immediate_danger) {
    urgency = 'critical'
  } else if (category === 'basement_water' || category === 'road_flooding') {
    urgency = 'high'
  } else if (category === 'damp_wall' || category === 'well_level') {
    urgency = 'medium'
  } else if (category === 'standing_water' || category === 'drainage_issue') {
    urgency = 'medium'
  }

  const commentText = (report.comment ?? '').trim()
  const hasComment = commentText.length > 5

  const summary = lang === 'ky'
    ? (hasComment ? `Тургундун билдирүүсү: «${commentText.slice(0, 150)}»` : 'Суу көйгөйү тууралуу сигнал катталды.')
    : (hasComment ? `Сообщение жителя: «${commentText.slice(0, 150)}»` : 'Зафиксирован сигнал о проблеме с водой.')

  let recommended_action = lang === 'ky'
    ? 'Кезектеги кароо учурунда текшерүү.'
    : 'Проверить участок в ходе планового объезда.'

  if (report.immediate_danger) {
    recommended_action = lang === 'ky'
      ? 'Тез арада кызматкерди жиберүү жана 112 кызматы менен байланышуу.'
      : 'Срочный выезд дежурной группы и координация с 112.'
  } else if (category === 'basement_water') {
    recommended_action = lang === 'ky'
      ? 'Дренажды текшерүү жана сууну сордурууну пландаштыруу.'
      : 'Осмотреть дренаж и запланировать откачку воды.'
  } else if (category === 'drainage_issue' || category === 'standing_water') {
    recommended_action = lang === 'ky'
      ? 'Арыктын өткөрүмдүүлүгүн жана суу агуусун текшерүү.'
      : 'Проверить пропускную способность арыка и водоотвода.'
  }

  const confidence = hasComment ? 0.65 : 0.5
  const needs_human_review = confidence < 0.6 || report.immediate_danger

  return {
    category,
    urgency,
    summary: summary.slice(0, 200),
    recommended_action: recommended_action.slice(0, 160),
    duplicate_group: candidateGroup,
    confidence,
    needs_human_review,
  }
}

async function callGeminiTriage(
  report: ReportRecord,
  candidateGroup: string | null,
  nearbyCount: number,
  lang: 'ru' | 'ky',
  apiKey: string,
): Promise<TriageResult> {
  const prompt = `Ты — опытный диспетчер службы сортировки бытовых заявок о воде SuuTech.
Твоя задача — классифицировать поступившую заявку жителя для оператора коммунальной службы/айыл окмоту.
Язык ответа: ${lang === 'ky' ? 'кыргызский' : 'русский'}.

ДАННЫЕ ЗАЯВКИ:
- Категория от жителя: ${report.category_user ?? 'не указана'}
- Комментарий жителя: ${report.comment ? `"${report.comment}"` : 'отсутствует'}
- Непосредственная опасность: ${report.immediate_danger ? 'ДА' : 'НЕТ'}
- Погода на момент заявки: ${
    report.weather_snapshot
      ? `температура ${report.weather_snapshot.temp_c ?? 'н/д'}°C, осадки ${report.weather_snapshot.precip_mm ?? 0} мм, влажность ${report.weather_snapshot.humidity ?? 'н/д'}%`
      : 'нет данных'
  }
- Похожих заявок рядом (<150м за 14 дней): ${nearbyCount}
- Предлагаемая группа дубликатов: ${candidateGroup ? `"${candidateGroup}"` : 'null'}

ПРАВИЛА КЛАССИФИКАЦИИ:
1. category: строго один из: basement_water, damp_wall, standing_water, drainage_issue, well_level, road_flooding, other.
2. urgency: строго один из: low, medium, high, critical.
   - Если опасность=ДА → critical или high!
   - Угроза людям/дому/дороге/электросети → critical.
   - Вода в подвале или на проезжей части → high.
   - Сырая стена, спад воды в колодце, стоячая вода во дворе → medium.
   - Косметика, лужа без угрозы → low.
3. summary: краткое нейтральное резюме фактов (до 200 символов).
4. recommended_action: четкое действие для дежурного (до 160 символов).
5. duplicate_group: если есть похожие рядом — используй переданную группу "${candidateGroup ?? ''}", иначе null.
6. confidence: уверенность от 0.0 до 1.0. Если данных мало — ставь < 0.6.
7. needs_human_review: true если confidence < 0.6 или есть сомнения, иначе false.

Верни СТРОГО один валидный JSON-объект без markdown кавычек по схеме:
{
  "category": "...",
  "urgency": "...",
  "summary": "...",
  "recommended_action": "...",
  "duplicate_group": ${candidateGroup ? `"${candidateGroup}"` : 'null'},
  "confidence": 0.85,
  "needs_human_review": false
}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[classify-report] Ошибка Gemini API:', response.status, errorText)
    throw new Error(`Gemini API вернул ${response.status}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) {
    throw new Error('Пустой ответ от Gemini')
  }

  const parsedJson = JSON.parse(rawText)
  return TriageSchema.parse(parsedJson)
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return preflightResponse()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED', message: 'Только POST' }, 405)
  }

  try {
    const client = serviceClient()
    await authorizeCaller(request, client)

    const rawBody = await request.text()
    if (!rawBody) {
      throw new ApiError('INVALID_INPUT', 400, 'Тело запроса пустое')
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      throw new ApiError('INVALID_INPUT', 400, 'Тело запроса не является JSON')
    }

    const { report_id, lang } = ClassifyReportRequestSchema.parse(parsedBody)

    // Читаем заявку
    const { data: report, error: reportError } = await client
      .from('reports')
      .select('id, created_at, category_user, comment, immediate_danger, weather_snapshot, lat, lng')
      .eq('id', report_id)
      .maybeSingle()

    if (reportError) {
      throw new ApiError('DB_ERROR', 500, `Ошибка чтения заявки: ${reportError.message}`)
    }
    if (!report) {
      throw new ApiError('NOT_FOUND', 404, `Заявка с id ${report_id} не найдена`)
    }

    const typedReport = report as ReportRecord

    // Поиск дубликатов
    let candidateGroup: string | null = null
    let nearbyCount = 0

    if (typedReport.lat != null && typedReport.lng != null) {
      const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data: candidates } = await client
        .from('reports')
        .select('id, created_at, category_user, lat, lng')
        .neq('id', typedReport.id)
        .gte('created_at', windowStart)
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (candidates && candidates.length > 0) {
        const nearbyReports = candidates.filter((c) => {
          if (c.lat == null || c.lng == null) return false
          const dist = distanceMeters(
            { lat: typedReport.lat!, lng: typedReport.lng! },
            { lat: c.lat, lng: c.lng },
          )
          if (dist > DUPLICATE_RADIUS_M) return false
          return areCategoriesRelated(typedReport.category_user ?? 'other', c.category_user ?? 'other')
        })

        if (nearbyReports.length > 0) {
          nearbyCount = nearbyReports.length
          candidateGroup = `geo-${typedReport.lat.toFixed(3)}-${typedReport.lng.toFixed(3)}-150`
        }
      }
    }

    // Триаж
    let triage: TriageResult
    let modelName = 'fallback-heuristic-v2'
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (apiKey) {
      try {
        triage = await callGeminiTriage(typedReport, candidateGroup, nearbyCount, lang, apiKey)
        modelName = GEMINI_MODEL
      } catch (err) {
        console.warn('[classify-report] Gemini сбой, используем фолбек:', err)
        triage = buildFallbackTriage(typedReport, candidateGroup, lang)
      }
    } else {
      triage = buildFallbackTriage(typedReport, candidateGroup, lang)
    }

    // Инварианты
    if (typedReport.immediate_danger && (triage.urgency === 'low' || triage.urgency === 'medium')) {
      triage.urgency = 'high'
    }
    if (triage.confidence < 0.6) {
      triage.needs_human_review = true
    }
    if (nearbyCount === 0) {
      triage.duplicate_group = null
    }

    // Запись в public.ai_triage
    const { error: upsertError } = await client.from('ai_triage').upsert(
      {
        report_id: typedReport.id,
        category_ai: triage.category,
        urgency_ai: triage.urgency,
        summary: triage.summary,
        recommended_action: triage.recommended_action,
        duplicate_group: triage.duplicate_group,
        confidence: triage.confidence,
        needs_human_review: triage.needs_human_review,
        model: modelName,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'report_id' },
    )

    if (upsertError) {
      console.error('[classify-report] Ошибка upsert в ai_triage:', upsertError)
      throw new ApiError('DB_ERROR', 500, `Ошибка записи ai_triage: ${upsertError.message}`)
    }

    return jsonResponse({
      success: true,
      report_id: typedReport.id,
      triage,
      model: modelName,
    })
  } catch (error) {
    return handleError(error)
  }
})
