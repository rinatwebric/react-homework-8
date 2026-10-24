-- SuuTech, Срез 4 (ТЗ v2.0 §12, §14): доступ модератора к точным координатам и служебным полям заявки.
-- Anon по-прежнему видит только округлённые lat_public/lng_public через view reports_public;
-- точные lat/lng, moderator_note и created_by открываются роли authenticated для работы в /admin.

grant select (lat, lng, moderator_note, created_by, location_adjusted_m)
  on public.reports to authenticated;
