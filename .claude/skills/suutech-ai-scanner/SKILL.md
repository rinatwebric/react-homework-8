---
name: suutech-ai-scanner
description: SuuTech photo scanner and AI risk assessment (slice 1, P0). Use when building the camera/gallery input, image compression and EXIF stripping, the `analyze-photo` Edge Function, the vision prompt, the AI JSON contract (is_relevant, risk_level, confidence, findings, recommendations, disclaimer, water_tips), zod validation, retry logic, or the result screen. Also use when tuning the prompt on test photos.
---

# AI-сканер SuuTech (P0, самый рискованный срез)

Цель среза: с телефона фото стены → через несколько секунд экран результата с уровнем риска,
находками, 3–5 рекомендациями, confidence и дисклеймером. Источник требований: `docs/spec.md` §6.1, §9.

## Поток
1. `<input type="file" accept="image/*" capture="environment">` + отдельная кнопка «Из галереи» (без `capture`).
2. Клиент: `browser-image-compression` → `maxSizeMB: 1`, `maxWidthOrHeight: 1280`, `fileType: 'image/jpeg'`,
   `useWebWorker: true`. Перекодирование через canvas удаляет EXIF (в т.ч. GPS) — не включай `preserveExif`.
3. Перед съёмкой — подсказка «Снимайте стену при хорошем свете, не снимайте людей».
4. `POST analyze-photo` (multipart или base64) с `client_id`, `lang` (`ru`|`ky`), `mode` (`resident`|`farmer`).
5. Функция: проверка MIME (`image/jpeg|png|webp`) и размера (≤ 2 МБ) → сохранить фото в Storage
   по пути `reports/{client_id}.jpg` (`upsert: true` — повтор не плодит файлы) → вызвать vision-модель →
   валидировать ответ zod → вернуть `{ assessment, photo_path }`.
6. Клиент повторно валидирует ответ той же схемой и показывает результат.

## Контракт (единый источник: `supabase/functions/_shared/ai-contract.ts`; клиентская копия в `src/shared/types/`)
```ts
export const AssessmentSchema = z.object({
  is_relevant: z.boolean(),
  risk_level: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  findings: z.array(z.string().min(1)).max(6),
  recommendations: z.array(z.string().min(1)).min(1).max(5),
  disclaimer: z.string().min(1),
  water_tips: z.array(z.string()).max(5).optional(), // только mode = farmer
});
```
- При `is_relevant: false` модель всё равно заполняет поля (risk_level `low`, confidence низкий) — UI
  игнорирует их и просит переснять. Не делай поля nullable без нужды: это ломает простые проверки.
- Порог низкой уверенности — константа `LOW_CONFIDENCE = 0.5` в конфиге; ниже → «Переснимите при лучшем свете».

## Промпт (системный)
- Роль: эксперт по строительной влажности и гидроизоляции частных домов в сельской местности Центральной Азии.
- Отвечать **только JSON по схеме**; язык строк — параметр `lang`.
- Осторожные формулировки, никаких диагнозов и гарантий; при сомнении — понижать `confidence`.
- `is_relevant: false`, если на фото нет стены/потолка/подвала/фундамента.
- Модель оценивает **видимые последствия** сырости; не утверждает и не оценивает уровень грунтовых вод —
  это делают датчики и ответы жителя (вода в подвале, глубина колодца).
- Рекомендации — конкретные и дешёвые действия (проветривание, отмостка, водосток, дренаж), последняя —
  «обратиться к специалисту», если риск `high`.
- Режим фермера — дополнительный блок про отвод/накопление воды для полива и риск заболачивания → `water_tips`.
- Если провайдер поддерживает structured outputs / JSON schema mode — используй его, а zod оставь как вторую линию.

## Ошибки и устойчивость
- Невалидный JSON или схема → **один** повтор запроса; затем ответ `{ error: 'AI_INVALID' }` (502), а UI предлагает
  «Сохранить отчёт без оценки» (отчёт уходит в очередь, оценка позже).
- Таймаут вызова модели ~25 с (`AbortController`); сеть упала → отчёт в офлайн-очередь (см. `suutech-offline-pwa`).
- Кэш по хэшу: SHA-256 сжатого файла → если такая оценка уже есть, вернуть её (экономия API и антидубль).
- Ключ модели: `supabase secrets set VISION_API_KEY=... VISION_MODEL=...`; в клиенте и логах ключа быть не должно.
- Логируй в функции только код ошибки, длительность и модель — без base64 фото.

## Экран результата
- Риск = цвет + SVG-иконка + текст через `src/shared/lib/risk.ts`: `low` → «норма» (зелёный), `medium` → «повышенный» (жёлтый), `high` → «высокий» (оранжевый). Красный (`critical`) у отчёта по фото не бывает.
- Находки, рекомендации, полоска confidence, дисклеймер «Предварительная оценка по фото, не заменяет осмотр
  специалиста» — **всегда видим**.
- Заголовок результата и питч подают это как **подсказку, а не диагноз**: формулировки вида «похоже на
  признаки сырости» и «стоит проверить», не «у вас подтопление». Окончательное решение — за человеком
  (подтверждение отчёта, осмотр специалиста). См. `docs/pitch.md` — почему это важно для защиты.
- Кнопки: «Отправить на карту» (дальше форма: вода в подвале + глубина колодца, затем геопозиция — см. `suutech-map-geo`) и «Переснять».

## Проверка
- Vitest: схема принимает эталонные ответы и отвергает битые (лишний уровень риска, confidence > 1, пустые рекомендации).
- Ручной прогон 10–15 реальных фото сырости + 3 нерелевантных (кот, улица, селфи). Таблица результатов в
  `docs/ai-test-photos.md`: фото → risk/confidence → ок/не ок. Подбери 3–4 фото со стабильным результатом для демо.
