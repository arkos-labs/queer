/*
# Queer Service — identity verification (document upload + manual admin review)

Adds a private "identity-documents" storage bucket and a column to track
the uploaded document's path. Members upload a photo of an official ID;
an admin reviews it manually in the back-office and sets
profiles.verification_status accordingly (already existed: none / pending
/ verified / rejected). Documents are never public — only the owner and
admins can read them, via RLS on storage.objects.
*/

alter table public.profiles
  add column if not exists identity_document_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "identity_documents_owner_rw" on storage.objects;
create policy "identity_documents_owner_rw"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'identity-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);
