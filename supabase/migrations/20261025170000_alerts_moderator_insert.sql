-- SuuTech, Срез 5 (ТЗ v2.0 §12, §13): создание оперативных предупреждений модераторами.
-- 1. Допустимые уровни: 'info', 'warning', 'critical' (плюс обратная совместимость с 'elevated', 'high').
-- 2. Вставка разрешена роли authenticated, если пользователь подтверждён в private.is_moderator().

alter table public.alerts
  drop constraint if exists alerts_level_check;

alter table public.alerts
  add constraint alerts_level_check
  check (level in ('info', 'warning', 'critical', 'elevated', 'high'));

drop policy if exists alerts_insert_moderator on public.alerts;
create policy alerts_insert_moderator on public.alerts
  for insert to authenticated
  with check (private.is_moderator());

grant insert (area, level, message, source, audience, created_by, zone_id)
  on public.alerts to authenticated;

comment on table public.alerts is
  'Оперативные предупреждения службы (погода, ЧС, рекомендации): публикуются модераторами или сервисами, читаются всеми.';
