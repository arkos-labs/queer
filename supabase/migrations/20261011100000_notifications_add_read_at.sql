-- La base en ligne n'avait que `is_read` ; l'app lit `read_at` (pastille, liste des non lues).
alter table public.notifications add column if not exists read_at timestamptz;
update public.notifications set read_at = created_at where is_read = true and read_at is null;
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
