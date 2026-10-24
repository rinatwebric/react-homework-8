-- ══════════════════════════════════════════════════════════════════════════════
-- Разрешение анонимной загрузки фото в бакет report-photos
-- ══════════════════════════════════════════════════════════════════════════════
-- Лимит размера файла (2 МБ) и допустимые типы (image/jpeg, image/png, image/webp)
-- уже зафиксированы на уровне бакета report-photos и проверяются Storage API.

drop policy if exists report_photos_anon_insert on storage.objects;

create policy report_photos_anon_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'report-photos');
