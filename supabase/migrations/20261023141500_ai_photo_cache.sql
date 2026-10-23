-- SuuTech, срез 1: кэш AI-оценок по фото и счётчик обращений для лимита частоты.
-- Зачем: (1) один и тот же файл не должен оплачиваться двумя вызовами vision-модели,
-- (2) лимит частоты считается по факту обращения, включая неудачные (иначе спам
-- невалидными фото бесплатен), (3) отчёт в срезе 2 ссылается на тот же photo_path.
--
-- Таблица служебная: анонимного доступа нет, пишет только Edge Function под service role.

create table public.photo_assessments (
  -- SHA-256 содержимого фото уже после сжатия на клиенте (1 МБ / 1280 px)
  sha256 text primary key check (sha256 ~ '^[0-9a-f]{64}$'),
  -- тот же идентификатор, что клиент пришлёт в reports.client_id (идемпотентность)
  client_id uuid not null,
  created_at timestamptz not null default now(),
  -- ok — оценка получена; ai_invalid / ai_timeout — модель не дала валидный ответ
  status text not null check (status in ('ok', 'ai_invalid', 'ai_timeout')),
  assessment jsonb,
  storage_path text,
  model text,
  lang text not null default 'ru' check (lang in ('ru', 'ky')),
  mode text not null default 'resident' check (mode in ('resident', 'farmer')),
  -- успешная запись обязана содержать оценку, неуспешная — нет
  constraint photo_assessments_ok_has_assessment check (
    (status = 'ok' and assessment is not null) or (status <> 'ok' and assessment is null)
  )
);

comment on table public.photo_assessments is
  'Кэш analyze-photo по SHA-256 фото + журнал обращений для лимита частоты. Доступ только у service role.';
comment on column public.photo_assessments.sha256 is
  'Хэш содержимого фото: одинаковый файл не отправляется в модель повторно.';
comment on column public.photo_assessments.status is
  'ok — оценка лежит в assessment; ai_invalid / ai_timeout — неудачные обращения, тоже учитываются в лимите.';
comment on column public.photo_assessments.storage_path is
  'Путь в бакете report-photos: отчёт среза 2 переиспользует это фото.';

create index photo_assessments_client_id_created_at_idx
  on public.photo_assessments (client_id, created_at desc);

alter table public.photo_assessments enable row level security;

-- Политик нет намеренно: таблица доступна только Edge Function под service role
-- (service role обходит RLS). Клиент не должен читать ни оценки, ни client_id других людей.
revoke all on public.photo_assessments from anon, authenticated;