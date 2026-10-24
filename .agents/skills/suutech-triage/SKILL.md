---
name: suutech-triage
description: SuuTech AI triage for the admin panel (P1). Use when building or tuning the classify-report Edge Function, the triage JSON contract (category, urgency, summary, recommended_action, duplicate_group, confidence, needs_human_review), duplicate grouping of nearby reports, zod validation of model output, storing results in ai_triage, or showing the AI suggestion in /admin next to the moderator's decision. Replaces the old suutech-ai-scanner skill.
---

# AI-триаж заявок SuuTech (только админка)

Требования: `docs/spec.md` §8, §12. AI больше **не** оценивает фото для жителя и не выдаёт уровень риска.
Он сортирует заявки для сотрудника службы. Поток: заявка создана → `classify-report` → строка в `ai_triage` →
модератор видит предложение и принимает решение.

## Что AI делает и чего не делает
- Делает: категорию (если житель выбрал «другое» или ошибся), срочность, краткое нейтральное резюме,
  рекомендуемый следующий шаг, группу похожих заявок, уверенность и флаг «нужна проверка человеком».
- Не делает: диагноз, «у вас подтопление», оценку уровня грунтовых вод, публикацию наружу.
  `ai_triage` не входит в `reports_public` — не добавляй туда эти поля никогда.
- Без фото работает по `category_user`, `comment`, `immediate_danger`, погоде и расстоянию до похожих заявок.
  Если данных мало — низкий `confidence`, `needs_human_review = true`, `summary` = «Недостаточно данных».

## Контракт (источник `supabase/functions/_shared/triage-contract.ts`, копия в `src/shared/types/`)
```ts
export const TriageSchema = z.object({
  category: z.enum(['basement_water','damp_wall','standing_water','drainage_issue','well_level','road_flooding','other']),
  urgency: z.enum(['low','medium','high','critical']),
  summary: z.string().min(1).max(200),
  recommended_action: z.string().min(1).max(160),
  duplicate_group: z.string().max(64).nullable(),
  confidence: z.number().min(0).max(1),
  needs_human_review: z.boolean(),
});
```
- Категории, подписи и цвета — только из `src/shared/lib/categories.ts` (копия в `_shared/`); не дублируй enum в компонентах.
- `confidence < 0.6` → бейдж «низкая уверенность» и `needs_human_review = true`.
- `immediate_danger = true` → `urgency` не ниже `high`, в карточке плашка «Связаться с 112» (звонок делает человек).

## Промпт
- Роль: диспетчер службы, который сортирует бытовые сообщения о воде.
- Отвечать **только JSON по схеме**; строки — на языке `lang` (`ru`/`ky`), тон нейтральный.
- Шкала `urgency`: угроза людям/дому/дороге/мосту/электросети → `critical`; вода в подвале или вода на проезде →
  `high`; сырая стена, низкий уровень в колодце → `medium`; косметика и «другое» → `low`.
- `duplicate_group` — короткий детерминированный идентификатор участка (`geo-42.351-76.171-150`), не ссылки на чужие id.
- Не выдумывай фактов, которых нет в заявке, и не обещай сроков реагирования.

## Дубликаты
- Кандидатов ищем в БД: заявки за 14 дней в радиусе 150 м с той же или родственной категорией
  (`standing_water` ↔ `drainage_issue`, `basement_water` ↔ `damp_wall`). Расстояние — чистые функции в `shared/lib/geo`.
- Модель только подтверждает группу. Кандидатов нет → `duplicate_group = null`.
- В админке «похожие заявки: N» со ссылками; автоматически закрывать заявки нельзя — решает модератор.

## Устойчивость
- Один повтор на невалидный JSON, затем `{ error: 'AI_INVALID' }`: заявка остаётся в `new`, модератор работает вручную.
- Таймаут вызова 20 с; ключ модели — только секрет функции; в логи пишем код, модель и длительность.
- Повторный вызов идемпотентен: `upsert` по `report_id` (первичный ключ), старое предложение перезаписывается.
- Функция проверяет роль вызывающего (`moderators`), иначе 403. В браузере ключа модели нет.

## Проверка
- Vitest: схема принимает эталонный ответ и отвергает `urgency: 'urgent'`, `confidence: 1.2`, пустой `summary`.
- Тест группировки дубликатов: 149 м — одна группа, 151 м — разные.
- Ручной прогон 10 реальных формулировок жителей: таблица «текст → категория/срочность → ок/не ок» в PR.