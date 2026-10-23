-- SuuTech, срез 2, PR-2: карта страны — границы зон (public/geo/) и их уровень риска.
--
-- Границы зон приходят из geoBoundaries gbOpen KGZ: ADM1 — 7 областей (ODbL 1.0),
-- ADM2 — 41 район (CC BY-SA 3.0). Здесь только данные риска, ключ — shapeID из GeoJSON.
--
-- В срезе 2 уровень зоны ещё никто не считает: правила зон — срез 3 (Edge Function
-- compute-zone-risk под service role). Поэтому таблица пустая, и это честное «нет данных»:
-- карта рисует такую зону серой, а не «нормой» (AGENTS.md: норма ≠ нет данных).
--
-- Не FK к reports.zone_id: у отчётов пилота id вида 'kg-issyk-ton-ak-olong' (bbox пилота),
-- привязка к району по point-in-polygon появится в срезе 3.

create table public.zone_risk (
  zone_id text primary key,
  level text not null check (level in ('normal', 'elevated', 'high', 'critical')),
  reasons text[] not null default '{}',
  source text not null default 'rules' check (source in ('rules', 'manual')),
  updated_at timestamptz not null default now()
);

comment on table public.zone_risk is
  'Риск зоны (область/район): zone_id = shapeID из public/geo/*.geojson. Считается правилами в срезе 3; нет строки = нет данных.';

alter table public.zone_risk enable row level security;

-- Карта публичная: читают все. Пишут только Edge Functions под service role (срез 3),
-- поэтому политик на insert/update нет и прав на запись у клиентов тоже нет.
create policy zone_risk_select_all on public.zone_risk
  for select to anon, authenticated
  using (true);

revoke all on public.zone_risk from anon, authenticated;
grant select on public.zone_risk to anon, authenticated;