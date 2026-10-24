-- SuuTech, ТЗ v2.0 (24.10.2026): заявка жителя без обязательного фото + AI-триаж для админки.
-- Миграция аддитивная: колонки v1.0 (risk_level, findings, water_in_basement, well_depth_m, mode,
-- photo_sha256) остаются, пока прод-фронт не переведён на новый контракт. Их удаление — отдельный PR очистки,
-- чтобы `/map` и `/admin` на проде не сломались в процессе перевода.
-- Требования: docs/spec.md §7 (форма), §8 (AI-триаж), §12 (админка), §14 (данные).

-- ── 1. Новые поля заявки (§14) ────────────────────────────────────────────────
alter table public.reports
  add column if not exists category_user text,
  add column if not exists comment text,
  add column if not exists location_adjusted_m real,
  add column if not exists immediate_danger boolean not null default false,
  add column if not exists weather_snapshot jsonb,
  add column if not exists created_by uuid references auth.users (id) on delete set null;

comment on column public.reports.category_user is
  'Категория, выбранная жителем. Обязательна для новых заявок, null — у заявок v1.0.';
comment on column public.reports.comment is 'Комментарий жителя, до 500 символов.';
comment on column public.reports.location_adjusted_m is
  'На сколько метров житель сдвинул метку от GPS. Не больше 300 (§7.2).';
comment on column public.reports.immediate_danger is
  'Ответ «есть непосредственная опасность». Не заменяет звонок 112 (§11).';
comment on column public.reports.weather_snapshot is
  'Снимок погоды в момент заявки (t, осадки, влажность), справочные данные Open-Meteo.';
comment on column public.reports.created_by is
  'Кто создал заявку из админки. У заявок жителей null — регистрации нет.';

alter table public.reports
  drop constraint if exists reports_category_user_check,
  add constraint reports_category_user_check check (
    category_user is null or category_user in (
      'basement_water', 'damp_wall', 'standing_water',
      'drainage_issue', 'well_level', 'road_flooding', 'other'
    )
  ),
  drop constraint if exists reports_comment_check,
  add constraint reports_comment_check check (
    comment is null or char_length(comment) <= 500
  ),
  drop constraint if exists reports_location_adjusted_check,
  add constraint reports_location_adjusted_check check (
    location_adjusted_m is null
      or (location_adjusted_m >= 0 and location_adjusted_m <= 300)
  );

-- Статусы §12. 'reviewed' — legacy v1.0, остаётся до PR очистки (прод-админка ещё его использует).
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (
  status in ('new', 'triaged', 'assigned', 'in_progress', 'resolved', 'rejected', 'reviewed')
);

create index if not exists reports_category_user_idx on public.reports (category_user);

-- ── 2. AI-триаж (только админка, §8.1) ────────────────────────────────────────
-- AI только предлагает значения; окончательное решение за модератором (§8.1).
create table if not exists public.ai_triage (
  report_id uuid primary key references public.reports (id) on delete cascade,
  category_ai text check (
    category_ai is null or category_ai in (
      'basement_water', 'damp_wall', 'standing_water',
      'drainage_issue', 'well_level', 'road_flooding', 'other'
    )
  ),
  urgency_ai text check (urgency_ai is null or urgency_ai in ('low', 'medium', 'high', 'critical')),
  summary text,
  recommended_action text,
  duplicate_group text,
  confidence real check (confidence is null or confidence between 0 and 1),
  needs_human_review boolean not null default true,
  model text,
  created_at timestamptz not null default now()
);

comment on table public.ai_triage is
  'Предложение AI-триажа для заявки. Не публикуется и не является диагнозом (§8).';

create index if not exists ai_triage_duplicate_group_idx on public.ai_triage (duplicate_group);
create index if not exists ai_triage_needs_review_idx on public.ai_triage (needs_human_review);

alter table public.ai_triage enable row level security;

drop policy if exists ai_triage_select_moderator on public.ai_triage;
create policy ai_triage_select_moderator on public.ai_triage
  for select to authenticated
  using (private.is_moderator());

revoke all on public.ai_triage from anon, authenticated;
-- Модератор читает триаж в /admin; пишет только Edge Function под service role.
grant select on public.ai_triage to authenticated;

-- ── 3. История статусов (§12) ─────────────────────────────────────────────────
create table if not exists public.report_status_history (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);

comment on table public.report_status_history is
  'История изменения статуса заявки: кто, когда и с каким комментарием (§12).';

create index if not exists report_status_history_report_idx
  on public.report_status_history (report_id, created_at desc);

alter table public.report_status_history enable row level security;

drop policy if exists report_status_history_select_moderator on public.report_status_history;
create policy report_status_history_select_moderator on public.report_status_history
  for select to authenticated
  using (private.is_moderator());

revoke all on public.report_status_history from anon, authenticated;
grant select on public.report_status_history to authenticated;

-- История пишется триггером: работает и из RPC, и из Edge Function, и из SQL-правки модератора.
create or replace function private.log_report_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.report_status_history
      (report_id, from_status, to_status, note, changed_by)
    values
      (new.id, old.status, new.status, new.moderator_note, auth.uid());
  end if;
  return new;
end;
$$;

comment on function private.log_report_status() is
  'Триггерная функция: пишет переход статуса заявки в report_status_history.';

drop trigger if exists reports_status_history_trigger on public.reports;
create trigger reports_status_history_trigger
  after update of status on public.reports
  for each row execute function private.log_report_status();

-- ── 4. alerts: зона словами вместо zone_id (§14) ──────────────────────────────
alter table public.alerts
  add column if not exists area text,
  add column if not exists created_by uuid references auth.users (id) on delete set null;

comment on column public.alerts.area is
  'Зона предупреждения словами (например «Ак-Өлөң, центр»). zone_id — legacy v1.0.';

-- ── 5. Публичное представление v2 ─────────────────────────────────────────────
-- security_invoker = true → работают RLS и колоночные права вызывающего (см. init-миграцию).
-- Без точных lat/lng, device_hash, moderator_note, created_by и без ai_triage (§14).
-- Новые колонки дописаны в конец: `create or replace view` не разрешает менять порядок существующих.
create or replace view public.reports_public
with (security_invoker = true)
as
select
  id,
  created_at,
  captured_at,
  lat_public,
  lng_public,
  zone_id,
  -- поля v1.0: нужны, пока фронт не переведён на категории
  risk_level,
  confidence,
  findings,
  recommendations,
  water_in_basement,
  well_depth_m,
  status,
  photo_path,
  mode,
  is_demo,
  -- ТЗ v2.0 §7, §14
  category_user,
  comment,
  immediate_danger,
  weather_snapshot,
  accuracy_m
from public.reports;

comment on view public.reports_public is
  'Публичная карта: округлённые координаты (~100 м), без точных lat/lng, device_hash, заметок модератора и AI-триажа.';

grant select (category_user, comment, immediate_danger, weather_snapshot, accuracy_m)
  on public.reports to anon, authenticated;