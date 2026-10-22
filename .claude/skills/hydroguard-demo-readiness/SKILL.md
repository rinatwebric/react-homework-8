---
name: hydroguard-demo-readiness
description: HydroGuard KG feature flags, scope cutting, feature freeze, demo data, acceptance checklist, Lighthouse and bundle budgets, and stage demo rehearsal. Use when adding a feature flag, deciding whether a feature ships, preparing demo data or backup plans, checking acceptance criteria, or anything in the last 8 hours before the Logos Hackathon presentation.
---

# Готовность к демо HydroGuard

Источник: `docs/spec.md` §4, §12, §13, §16. Главное правило: **на сцене показываем только то, что стабильно работает.**

## Флаги
- `src/config/features.ts`:
  ```ts
  const flag = (v: string | undefined) => v === 'true';
  export const features = {
    weather: flag(import.meta.env.VITE_FF_WEATHER),
    offline: flag(import.meta.env.VITE_FF_OFFLINE),
    push: flag(import.meta.env.VITE_FF_PUSH),
    farmer: flag(import.meta.env.VITE_FF_FARMER),
    premium: flag(import.meta.env.VITE_FF_PREMIUM),
    kyrgyz: flag(import.meta.env.VITE_FF_KYRGYZ),
  } as const;
  ```
- P0 (сканер, гео, карта) — без флагов. Всё P1+ — за флагом, по умолчанию `false`; включается в Vercel env.
- Выключенная фича полностью исчезает из UI (не «скоро будет»), и её код не ломает сборку.

## Демо-данные
- 10–15 отчётов с `is_demo = true` по району пилота — сид `supabase/seed.sql`. На карте бейдж «Демо».
- 3–4 проверенных фото со стабильной оценкой лежат на демо-телефоне в галерее.
- Заранее сделанный отчёт на карте — запасной вариант, если AI/сеть упадут.

## Заморозка (за 6–8 ч до защиты)
- Никаких новых фич и обновлений зависимостей. Только баги из чек-листа ниже.
- Тег релиза `git tag demo-v1`; Vercel production указывает на этот коммит. SW не должен обновиться во время демо.
- Пролистать карту района на обоих телефонах (прогрев кэша тайлов), установить PWA, разрешить гео и уведомления.

## Чек-лист приёмки (`/freeze-check`)
- [ ] С телефона по ссылке: фото → оценка → подтверждение геопозиции → метка на карте.
- [ ] Отчёт без геопозиции отправить нельзя.
- [ ] Авиарежим: отчёт сохраняется и после появления сети уходит сам, без дублей.
- [ ] Приложение открывается без сети и показывает кэшированную карту района.
- [ ] Push из `/admin` приходит на Android; на iPhone — при установленной PWA.
- [ ] Погодный баннер показывает данные по текущей геопозиции.
- [ ] `/admin` доступен только модераторам; статусы меняются и видны на карте.
- [ ] Ключи API не видны в бандле и сетевых запросах (`grep` по `dist/`, вкладка Network).
- [ ] Android Chrome + iOS Safari; Lighthouse PWA/Performance ≥ 85 (мобильный профиль).
- [ ] Основной чанк ≤ ~200 КБ gzip (`npm run build` выводит размеры); карта и админка — отдельные чанки.
- [ ] Нигде нет белого экрана: проверить с выключенной сетью, с отказом гео, с битым ответом AI.
- [ ] Резервное видео демо записано; 3 репетиции питча проведены.

## Сценарий (90 с живого демо)
QR → PWA → скан заранее подготовленного фото → результат → отчёт на карту → авиарежим → второй отчёт →
сеть → метка появилась → `/admin` → статус «в работе» → «Отправить предупреждение» → push на втором телефоне.
