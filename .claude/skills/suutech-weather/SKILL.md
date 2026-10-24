---
name: suutech-weather
description: SuuTech weather block (P0 in TZ v2.0). Use when calling Open-Meteo for current temperature, precipitation, humidity and a 3-day forecast, caching it with a TTL, writing the weather-current Edge Function, storing a weather snapshot inside a report, showing the home-screen weather card and the "rain expected" banner, or keeping the block honest about being reference data rather than a flood forecast.
---

# Погода SuuTech (ТЗ v2.0, §10)

Погода — видимая часть продукта: житель открывает приложение и сразу видит, что происходит с водой в небе,
а заявка сохраняет снимок условий на момент отправки. Требования: `docs/spec.md` §10.
Датчиков и влажности почвы в MVP больше нет — старые правила удаляются в PR-5.

## Open-Meteo (без ключа)
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}
    &current=temperature_2m,relative_humidity_2m,precipitation,rain,showers
    &hourly=precipitation_probability,precipitation
    &daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min
    &forecast_days=4&timezone=auto
```
- `current` — температура, влажность, осадки «сейчас»; `daily` — 4 дня (сегодня + 3), в UI показываем 3 будущих.
- Одна точка — объект; несколько координат через запятую — **массив в том же порядке**. Для сетки отправляй пачки по 20–50.
- Валидируй zod; `null` в массивах → пропускаем значение и логируем, а не рисуем `NaN`. Координаты для запроса округляем до 0.01.
- Таймзона — `auto`; время обновления показываем в местном времени.

## Edge Function `weather-current`
- `GET ?lat&lng` для точки пользователя и `GET ?zone_id` для пилотной зоны (координаты берутся из `src/config/zones.json`).
- Кэш: таблица/`kv` с TTL 30–60 минут (для демо хватает 30). Ошибка или таймаут Open-Meteo → отдать последний кэш
  с отметкой времени; кэша нет — 502 и в UI «Погода недоступна», блок просто скрывается.
- Ответ: `{ temp_c, feels_like_c?, humidity, precip_mm, precip_probability, updated_at, days: [{date, t_max, t_min, precip_mm, precip_prob}] }`.
- Никаких ключей в клиенте; функция публичная, данные не персональные.

## Снимок в заявке
- `submit-report` пишет `weather_snapshot` (те же поля, компактно) на момент создания заявки. Если функция недоступна —
  `weather_snapshot = null`, заявка всё равно уходит: погода не блокирует отправку.
- В карточке админки снимок показывается как контекст («на момент заявки: +12 °C, дождь 1.2 мм»), без выводов о риске.

## Главный экран
- Карточка погоды: крупная температура, иконка условий, осадки/вероятность, влажность, три дня вперёд.
- Баннер «Ожидаются осадки — проверьте подвалы, арыки и места скопления воды» при
  `precip_probability ≥ 60 %` или `precip_mm > 5` в ближайшие 24 часа. Это совет, не прогноз подтопления.
- Рядом с погодой — кнопка 112 (см. `suutech-demo-readiness`): при опасности человек звонит, а не ждёт.
- Офлайн — последнее значение из кэша с отметкой времени, без «пустого» блока.
- Подпись источника «Open-Meteo» и формулировка «справочные данные».

## Тесты
- Vitest: парсинг ответа (одна точка и массив), отсутствующие поля, выбор иконки по коду осадков,
  порог баннера (59 % — нет, 60 % — да), форматирование дней.
- Фикстуры реальных ответов в `src/features/home/__fixtures__/`.