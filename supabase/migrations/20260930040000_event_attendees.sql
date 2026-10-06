/*
# Participation aux événements

Un membre connecté peut signaler qu'il va à un événement ; les autres membres
connectés voient la liste des participant·e·s et peuvent s'organiser entre eux
(via la fiche profil). Visible uniquement par les membres connectés.
*/

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index if not exists event_attendees_profile_idx on public.event_attendees (profile_id);

alter table public.event_attendees enable row level security;

drop policy if exists "event_attendees_select_authenticated" on public.event_attendees;
create policy "event_attendees_select_authenticated"
  on public.event_attendees for select
  to authenticated using (true);

drop policy if exists "event_attendees_insert_own" on public.event_attendees;
create policy "event_attendees_insert_own"
  on public.event_attendees for insert
  to authenticated with check (profile_id = auth.uid());

drop policy if exists "event_attendees_delete_own" on public.event_attendees;
create policy "event_attendees_delete_own"
  on public.event_attendees for delete
  to authenticated using (profile_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_attendees'
  ) then
    alter publication supabase_realtime add table public.event_attendees;
  end if;
end $$;

notify pgrst, 'reload schema';
