-- SuuTech, срез 0: базовая схема (отчёты жителей, алерты, push-подписки, модераторы).
-- Правила: только миграции, RLS на всех таблицах, публично — лишь округлённые координаты.
-- Датчики (sensors, sensor_readings, zone_risk) появятся в срезе 3.

-- ── Отчёты жителей ────────────────────────────────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- client_id генерирует клиент: идемпотентность повторной отправки из офлайн-очереди
  client_id uuid not null unique,
  created_at timestamptz not null default now(),
  captured_at timestamptz,
  photo_path text,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  accuracy_m real check (accuracy_m is null or accuracy_m >= 0),
  zone_id text,
  -- оценка AI по фото (уровня critical по фото не бывает)
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  confidence real check (confidence is null or confidence between 0 and 1),
  findings text[] not null default '{}',
  recommendations jsonb not null default '[]'::jsonb,
  water_in_basement boolean not null default false,
  well_depth_m numeric(5, 2) check (well_depth_m is null or well_depth_m between 0 and 50),
  mode text not null default 'resident' check (mode in ('resident', 'farmer')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'in_progress', 'resolved')),
  moderator_note text,
  device_hash text,
  photo_sha256 text,
  is_demo boolean not null default false,
  -- Публичные координаты: ≈100 м по широте (111 м) и ≈82 м по долготе на 42° с.ш.
  lat_public double precision generated always as (round(lat::numeric, 3)::double precision) stored,
  lng_public double precision generated always as (round(lng::numeric, 3)::double precision) stored
);

comment on table public.reports is 'Отчёты жителей. Полные координаты и device_hash — только для модераторов.';
comment on column public.reports.client_id is 'Идемпотентность: повторная отправка того же отчёта не создаёт дубль.';
comment on column public.reports.well_depth_m is 'Глубина воды в колодце, м. Необязательное поле.';

create index reports_created_at_idx on public.reports (created_at desc);
create index reports_status_idx on public.reports (status);
create index reports_risk_level_idx on public.reports (risk_level);
create index reports_zone_id_idx on public.reports (zone_id);

-- ── Push-подписки ─────────────────────────────────────────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys jsonb not null,
  -- район подписки, округлён до ~1 км: точное местожительство не храним
  area_lat double precision check (area_lat is null or area_lat between -90 and 90),
  area_lng double precision check (area_lng is null or area_lng between -180 and 180),
  zone_id text,
  lang text not null default 'ru' check (lang in ('ru', 'ky')),
  created_at timestamptz not null default now()
);

create index push_subscriptions_zone_id_idx on public.push_subscriptions (zone_id);

-- ── Алерты (погода, датчики, ручные) ──────────────────────────────────────────
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  zone_id text,
  level text not null check (level in ('elevated', 'high', 'critical')),
  message text not null,
  source text not null default 'weather' check (source in ('weather', 'sensor', 'manual')),
  audience text not null default 'residents' check (audience in ('residents', 'services'))
);

create index alerts_created_at_idx on public.alerts (created_at desc);
create index alerts_zone_id_idx on public.alerts (zone_id);

-- ── Модераторы (службы) ───────────────────────────────────────────────────────
create table public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.moderators is 'Белый список Supabase Auth: только эти аккаунты могут менять отчёты.';

-- ── Проверка роли модератора ──────────────────────────────────────────────────
create schema if not exists private;

-- security definer + пустой search_path: функцию нельзя «подменить» объектами в public
create function private.is_moderator()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1 from public.moderators where user_id = auth.uid()
  );
$$;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_moderator() to anon, authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.reports enable row level security;
alter table public.alerts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.moderators enable row level security;

-- reports: читать можно всем, но права выданы только на безопасные колонки (см. grant ниже).
-- Точные lat/lng, device_hash, moderator_note и photo_sha256 анониму недоступны.
create policy reports_select_all on public.reports
  for select to anon, authenticated
  using (true);

-- Менять статус может только модератор.
create policy reports_update_moderator on public.reports
  for update to authenticated
  using (private.is_moderator())
  with check (private.is_moderator());

revoke all on public.reports from anon, authenticated;
grant select (
  id, created_at, captured_at, lat_public, lng_public, zone_id, risk_level, confidence,
  findings, recommendations, water_in_basement, well_depth_m, status, photo_path, is_demo, mode
) on public.reports to anon, authenticated;

-- Модератору разрешено менять только статус и заметку (плюс RLS-политика выше).
grant update (status, moderator_note) on public.reports to authenticated;

-- alerts: публично читаем (жители видят предупреждения), пишут только функции/службы
create policy alerts_select_all on public.alerts
  for select to anon, authenticated
  using (true);

revoke all on public.alerts from anon, authenticated;
grant select on public.alerts to anon, authenticated;

-- push_subscriptions: доступ только через Edge Function (service role)
revoke all on public.push_subscriptions from anon, authenticated;

-- moderators: модератор видит только свою запись
create policy moderators_select_self on public.moderators
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.moderators from anon, authenticated;
grant select on public.moderators to authenticated;

-- ── Публичное представление отчётов ───────────────────────────────────────────
-- security_invoker = true → работают RLS и колоночные права вызывающего.
-- Без этого view обходил бы RLS (предупреждение официального скилла Supabase).
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
  risk_level,
  confidence,
  findings,
  recommendations,
  water_in_basement,
  well_depth_m,
  status,
  photo_path,
  mode,
  is_demo
from public.reports;

comment on view public.reports_public is
  'Публичная карта: координаты округлены до ~100 м, без device_hash и точных lat/lng.';

revoke all on public.reports_public from anon, authenticated;
grant select on public.reports_public to anon, authenticated;

-- ── Storage: фото отчётов ─────────────────────────────────────────────────────
-- Только изображения до 2 МБ. Путь — UUID: reports/{client_id}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Чтение — публичное по неугадываемому пути (EXIF удаляется на клиенте).
-- Политик на insert нет: загрузка идёт только из Edge Functions под service role.
create policy report_photos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'report-photos');
