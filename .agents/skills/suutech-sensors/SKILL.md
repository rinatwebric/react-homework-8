---
name: suutech-sensors
description: SuuTech sensor layer and zone risk (P1, simulated in demo). Use when working on sensors, sensor_readings or zone_risk tables, the ingest-sensor and compute-zone-risk Edge Functions, per-sensor API keys and rate limits, threshold risk rules against the 14-day median, the four risk levels (normal/elevated/high/critical), the virtual sensor simulator script and the "sharp rise" demo scenario, alerts for residents and services/MChS, an optional real ESP32 sensor, or the P2 excess water volume estimate.
---

# Датчики и риск зон SuuTech

Требования: `docs/spec.md` §6.9, §6.10, §9 («Таблицы для датчиков»), §13 (демо). Перед работой с БД загрузи
`suutech-backend` + `supabase`. Уровни и цвета — таблица в `AGENTS.md`.

## Честность (блокер)
- В демо показания **симулированы**: `sensors.is_simulated = true`, на карте и в админке бейдж «Симуляция».
- Риск — **пороговые правила**, не ML и не «AI-прогноз». ML — только в дорожной карте.
- Объём воды — только пилотная зона, подпись «оценка, не измерение»; по стране не считаем.

## Данные
- `sensors`: `id uuid`, `name`, `lat`, `lng`, `type ('well'|'soil'|'canal')`, `zone_id`, `api_key_hash`,
  `is_simulated boolean default false`, `created_at`. `api_key_hash` — SHA-256 ключа; сам ключ показывается один раз.
- `sensor_readings`: `id bigint identity`, `sensor_id`, `ts timestamptz`, `water_level_cm`, `soil_moisture_pct`,
  `temp_c`, `pressure_hpa` (последние два nullable). `unique (sensor_id, ts)` — повтор пакета не плодит строк.
  Индекс `(sensor_id, ts desc)`.
- `zone_risk`: `zone_id` (код области/района из GeoJSON, pk), `level ('normal'|'elevated'|'high'|'critical')`,
  `reason jsonb` (какие правила сработали — для админки и честного объяснения), `updated_at`.
- RLS: публичное чтение `zone_risk`, `sensors` (без `api_key_hash` — через column grants) и последних показаний;
  запись — только из функций (service role). `water_level_cm` — расстояние от поверхности до воды или высота
  столба? **Зафиксируй одно** в `docs/decisions.md` (рекомендация: глубина до воды от поверхности, меньше = опаснее)
  и используй везде одинаково.

## `ingest-sensor`
- `POST` JSON, валидация zod: `{ sensor_id: uuid, ts: ISO, water_level_cm?: number, soil_moisture_pct?: 0..100,
  temp_c?: number, pressure_hpa?: number }`, хотя бы одно измерение обязательно; `ts` не из будущего (> 5 мин) и не старше 7 дней.
- Аутентификация: заголовок `x-sensor-key` → SHA-256 → сравнить с `api_key_hash` датчика (сравнение постоянного времени).
- Лимит частоты: не чаще 1 показания в минуту на датчик (для симулятора — флаг ускорения только у `is_simulated`).
- Можно принимать массив (пакет после потери связи) — до 100 показаний.
- После записи — вызвать пересчёт зоны датчика (`compute-zone-risk` для одной зоны), ответ `{ accepted, duplicates }`.
- ESP32 (бонус): тот же эндпоинт по HTTPS, ключ в прошивке; пример скетча — `docs/esp32.md`, без реальных ключей в репо.

## Правила риска (чистые функции, `supabase/functions/_shared/zone-rules.ts`)
- Норма датчика — медиана показаний за 14 дней (если данных < 3 дней — норма из конфига датчика/типа).
- Сигналы (пороги в `config` — стартовые, подписаны «калибруются на данных пилота»):
  - уровень воды выше нормы на X см → `elevated`; резкий рост за 6–24 ч на Y см → +1 уровень;
  - влажность почвы (датчик или Open-Meteo `soil_moisture_*`) выше нормы → +1 уровень, но не выше `high` сама по себе;
  - прогноз осадков из `suutech-weather` выше порога → +1 уровень;
  - отчёты жителей в зоне (`water_in_basement = true`, AI `high`) за 72 ч — учитываются как дополнительный сигнал.
- Итог зоны = максимум по источникам с ограничением `critical` — только при прямом сигнале датчика (уровень воды)
  плюс хотя бы ещё одном сигнале. Функция возвращает `{ level, reasons[] }`.
- Тесты Vitest: граничные значения, нет данных, резкий рост, совмещение сигналов, монотонность (больше воды ≠ ниже риск).

## `compute-zone-risk`
- Запуск: по расписанию (вместе с `weather-check`, раз в 3 ч, `pg_cron` + `pg_net` + секрет) и после каждого показания.
- Пишет `zone_risk`; при **переходе** зоны в `high`/`critical` (а не при каждом пересчёте) — запись в `alerts`
  (`audience: 'residents'` и `'services'`, `zone_id`, `level`, `message`, `source: 'sensor'|'weather'`) + `send-push`
  подписчикам зоны. Защита от спама: не чаще 1 алерта на зону за 6 ч, кроме повышения уровня.

## Симулятор (`scripts/simulate-sensors.ts`, `npm run simulate`)
- 3–4 виртуальных датчика в районе пилота (сид в `supabase/seed.sql`, `is_simulated = true`).
- Режимы: `--mode normal` (шум вокруг нормы), `--mode rise` (резкий рост за несколько минут для демо),
  `--mode reset`. Параметры: `--speed` (ускорение времени), `--url`, ключи — из `.env.local` (не коммитить).
- Шлёт данные через тот же `ingest-sensor` — пайплайн реальный, симулированы только числа.
- Демо-сценарий: `npm run simulate -- --mode rise` → зона на карте становится «высокий» → баннер и push на втором телефоне.

## UI
- Карта: датчики — отдельный значок (не круглая метка отчёта), popup: тип, последнее показание, тренд за 24 ч,
  бейдж «Симуляция». Зоны — заливка по уровню из `zone_risk` (см. `suutech-map-geo`).
- `/admin`: список зон с уровнем и `reasons`, фильтр алертов «для служб» (МЧС, муниципальные службы), CSV.
- P2 объём: для пилотной зоны `площадь (га) × средняя глубина (м) × 10 = тыс. м³`; источники площади/глубины
  указать рядом; подпись «оценка, не измерение». Чистая функция с тестом.
