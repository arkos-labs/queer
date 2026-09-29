insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-images', 'place-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "place_images_public_read" on storage.objects;
create policy "place_images_public_read" on storage.objects
  for select using (bucket_id = 'place-images');

drop policy if exists "place_images_member_upload" on storage.objects;
create policy "place_images_member_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'place-images' and (storage.foldername(name))[1] = auth.uid()::text);
