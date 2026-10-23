-- SuuTech, срез 2, PR-1: отправка отчёта жителя (Edge Function `submit-report`).
-- Схема reports уже создана в срезе 0 (client_id unique, device_hash, photo_path,
-- water_in_basement, well_depth_m, findings, recommendations, mode, risk_level,
-- confidence, captured_at). Здесь добавляем только то, чего не хватало для
-- лимита частоты и для гарантии «фото принадлежит отчёту».

-- ── Хэш IP для лимита частоты ─────────────────────────────────────────────────
-- Открытый IP не храним: только SHA-256. Лимит по IP нужен, потому что
-- device_hash легко сбросить (очистка localStorage), а сеть — нет.
alter table public.reports add column if not exists ip_hash text;

alter table public.reports
  add constraint reports_ip_hash_sha256 check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$');

comment on column public.reports.ip_hash is
  'SHA-256 IP запроса: только для лимита частоты и антиспама. Публично не отдаётся.';

-- ── Фото принадлежит тому же client_id ────────────────────────────────────────
-- analyze-photo пишет файл в reports/{client_id}/…; отчёт обязан ссылаться на свою
-- папку, иначе чужое фото можно привязать к своему отчёту.
alter table public.reports
  add constraint reports_photo_belongs_to_client check (
    photo_path is null
    or photo_path like client_id::text || '/%'
    or photo_path like 'reports/' || client_id::text || '/%'
  );

-- ── Индексы под лимит частоты (окно — последний час) ──────────────────────────
create index if not exists reports_device_hash_created_at_idx
  on public.reports (device_hash, created_at desc);
create index if not exists reports_ip_hash_created_at_idx
  on public.reports (ip_hash, created_at desc);

-- ── Права не меняются ─────────────────────────────────────────────────────────
-- У anon/authenticated нет ни insert, ни select на reports: колоночные гранты
-- перечислены явно и ip_hash туда не входит. Запись — только service role
-- (Edge Function), чтение — через view reports_public.