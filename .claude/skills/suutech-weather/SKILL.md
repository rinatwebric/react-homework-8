---
name: suutech-weather
description: SuuTech weather and soil-moisture flood risk (P1). Use when calling Open-Meteo (past 7 days precipitation, 3-day forecast, soil moisture), building the country-wide grid of district centers, writing the weather threshold rules, the weather-check Edge Function and its 3-6 hour schedule, the home-screen risk banner, or farmer water advice tied to weather.
---

# Погода и влажность почвы SuuTech

Требования: `docs/spec.md` §6.4, §6.6. Погода — один из трёх сигналов риска зоны (см. `suutech-sensors`).

## Open-Meteo (без ключа)
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat1,lat2,...}&longitude={lng1,lng2,...}
    &daily=precipitation_sum&hourly=soil_moisture_3_to_9cm,soil_moisture_27_to_81cm
    &past_days=7&forecast_days=3&timezone=auto
```
- Одна точка → объект; **несколько точек через запятую → массив объектов** в том же порядке. Для сетки страны
  отправляй пачками (например по 20–50 точек), а не 41 отдельный запрос.
- `daily.precipitation_sum` — 10 значений (мм): 7 прошедших + 3 прогнозных, сегодняшний день входит в прогнозные.
- `hourly.soil_moisture_*` — объёмная влажность, **м³/м³** (0.18 = 18 %), 240 часовых значений. Для правил бери
  среднее за последние 24 ч и сравнивай с медианой за 7 дней из того же ответа. Не смешивай с `soil_moisture_pct`
  датчиков (там проценты) — переводи явно.
- Валидируй zod; `null` в массивах → пропустить значение и залогировать. Координаты пользователя округляй до 0.01.

## Сетка страны
- Точки — центроиды районов из того же GeoJSON, что и зоны карты (`suutech-map-geo`), с `zone_id`.
  Сгенерируй их скриптом из GeoJSON в `src/config/zones.json` (`zone_id`, `name`, `lat`, `lng`), не вручную.
- `weather-check` по расписанию (раз в 3 ч, `pg_cron` + `pg_net` + секрет) проходит всю сетку, сохраняет
  результаты (`weather_snapshot` по `zone_id`) и вызывает `compute-zone-risk`. Так «вся страна» в демо
  подтверждена погодным слоем, без выдуманных данных.

## Правило погодного риска (единый источник)
- `supabase/functions/_shared/weather-rules.ts`:
  `assessWeather({ past7, next3, soilNow, soilMedian }, thresholds) → { level: 'normal'|'elevated'|'high', reasons[] }`.
- Пороги в конфиге (`WEATHER_THRESHOLDS = { elevated: 40, high: 70 }` мм суммарно; влажность почвы выше медианы на
  20 % → +1 уровень, не выше `high`). Погода сама не даёт `critical` — это только с датчиками.
- В UI и питче честно: «стартовые пороги, калибруются по данным пилота».
- Клиент не дублирует логику: баннер берёт результат из `weather-check` (`GET ?lat&lng`). Функция недоступна →
  баннер не показываем, уровень на клиенте не придумываем.

## Баннер на главной
- `normal` — компактная зелёная плашка (или скрыта); `elevated`/`high` — жёлтый/оранжевый, иконка, текст + 2–3 совета.
  Если зона пользователя в `critical` по датчикам — красный баннер из `zone_risk`/`alerts`.
- Время обновления и источник «Open-Meteo»; офлайн — последнее значение из кэша с отметкой времени.
- Режим фермера: блок «Вода для фермеров» по тем же данным (накопление при осадках, полив в сухие дни, риск заболачивания при высокой влажности почвы).

## Тесты
- Vitest: `assessWeather` на граничных значениях, `null`, нет данных о почве; парсинг массива из нескольких точек.
- Фикстуры реальных ответов (одна точка и несколько) в `src/features/weather/__fixtures__/`.
