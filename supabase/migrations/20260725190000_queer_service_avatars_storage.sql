/*
# Queer Service — profile photo uploads (Supabase Storage)

Public "avatars" bucket so profile pictures can be uploaded directly
from the app instead of requiring an external image URL. Files are
stored under `<user_id>/<filename>`, and RLS on `storage.objects`
restricts writes to a member's own folder while keeping reads public
(profile photos are already shown to the whole community in the
directory).
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
