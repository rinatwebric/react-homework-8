-- ══════════════════════════════════════════════════════════════════════════════
-- Удаление остатков схемы v1.0 из public.reports и переход на ТЗ v2.0
-- ══════════════════════════════════════════════════════════════════════════════
-- 1) Переводим legacy-статус 'reviewed' в 'triaged' и сужаем CHECK reports_status_check;
-- 2) Удаляем зависимое представление public.reports_public и legacy-индекс;
-- 3) Дропаем legacy-колонки v1.0:
--    risk_level, confidence, findings, recommendations, water_in_basement, well_depth_m, mode, photo_sha256;
-- 4) Пересобираем public.reports_public только с v2-полями и выдаём права anon/authenticated.

-- ── 1. Статус 'reviewed' (legacy v1.0) ────────────────────────────────────────
update public.reports set status = 'triaged' where status = 'reviewed';

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('new', 'triaged', 'assigned', 'in_progress', 'resolved', 'rejected'));

-- ── 2. Зависимости колонок: view и индекс ─────────────────────────────────────
drop view if exists public.reports_public cascade;
drop index if exists public.reports_risk_level_idx;

-- ── 3. Удаление legacy-колонок v1.0 ───────────────────────────────────────────
alter table public.reports
  drop column if exists risk_level,
  drop column if exists confidence,
  drop column if exists findings,
  drop column if exists recommendations,
  drop column if exists water_in_basement,
  drop column if exists well_depth_m,
  drop column if exists mode,
  drop column if exists photo_sha256;

-- ── 4. Публичное представление v2 ─────────────────────────────────────────────
-- security_invoker = true → работают RLS и колоночные права вызывающего.
create view public.reports_public
with (security_invoker = true)
as
select
  id,
  created_at,
  captured_at,
  lat_public,
  lng_public,
  zone_id,
  status,
  photo_path,
  is_demo,
  category_user,
  comment,
  immediate_danger,
  weather_snapshot,
  accuracy_m
from public.reports;

comment on view public.reports_public is
  'Публичная карта: округлённые координаты (~100 м), без точных lat/lng, device_hash, заметок модератора и AI-триажа.';

revoke all on public.reports_public from anon, authenticated;
grant select on public.reports_public to anon, authenticated;

grant select (
  id,
  created_at,
  captured_at,
  lat_public,
  lng_public,
  zone_id,
  status,
  photo_path,
  is_demo,
  category_user,
  comment,
  immediate_danger,
  weather_snapshot,
  accuracy_m
) on public.reports to anon, authenticated;
