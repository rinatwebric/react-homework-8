---
name: hydroguard-weather
description: HydroGuard KG weather-based flood risk (P1). Use when calling Open-Meteo (past 7 days precipitation + 3-day forecast), writing the threshold risk rules, the weather-check Edge Function and its 3-6 hour schedule, the home-screen risk banner, or farmer water advice tied to weather.
---

# Погодные предупреждения HydroGuard

Требования: `docs/spec.md` §6.4, §6.6.

## Open-Meteo (без ключа)
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}
    &daily=precipitation_sum&past_days=7&forecast_days=3&timezone=auto
```
- Ответ: `daily.time[]` и `daily.precipitation_sum[]` (мм), 10 значений: 7 прошедших + 3 прогнозных
  (сегодняшний день входит в прогнозные). Валидируй zod; `null` в массиве → считать 0 и логировать.
- Координаты в запросе округляй до 0.01 — меньше уникальных запросов, лучше кэш.

## Правило риска (единый источник)
- `supabase/functions/_shared/weather-rules.ts` — чистая функция
  `assessWeather({ past7, next3 }, thresholds) → { level: 'normal'|'elevated'|'high', past7Sum, next3Sum }`.
- Пороги — в конфиге (`WEATHER_THRESHOLDS = { elevated: 40, high: 70 }` мм суммарно — стартовые значения).
  В UI и питче честно: «стартовые пороги, калибруются по данным пилота».
- Клиент не дублирует логику: баннер берёт результат из `weather-check` (`GET ?lat&lng`). Если функция недоступна —
  баннер не показываем (не пугаем ложной тревогой), а не придумываем уровень на клиенте.

## `weather-check`
- Режим «точка» (для баннера): вернуть `{ level, past7Sum, next3Sum, updated_at }`; кэш в памяти/таблице на 1–3 ч.
- Режим «по расписанию»: пройти по уникальным `area_lat/area_lng` из `push_subscriptions`, посчитать уровень;
  при `elevated|high` и если по этой зоне не было алерта за последние 12 ч → запись в `alerts` + `send-push` на зону.
- Расписание каждые 3 ч: `pg_cron` + `pg_net` вызывает функцию с секретным заголовком (секрет — в Vault).
  Для демо достаточно ручного вызова и кнопки в админке.

## Баннер на главной
- `normal` — компактная зелёная плашка «Риск подтопления низкий» (или скрыта).
- `elevated` / `high` — жёлтый/красный, иконка, текст + 2–3 совета («проверьте подвал», «очистите водостоки»).
- Показывать время обновления и источник «Open-Meteo». Офлайн — последнее значение из кэша с пометкой времени.
- Режим фермера: блок «Вода для фермеров» по тем же данным (накопление при осадках, полив в сухие дни).

## Тесты
- Vitest: `assessWeather` на граничных значениях порогов, пустые/`null` данные.
- Фикстура реального ответа Open-Meteo в `src/features/weather/__fixtures__/`.
