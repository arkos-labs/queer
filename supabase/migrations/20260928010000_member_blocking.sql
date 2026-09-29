-- Let members block another member. A block hides the profile and prevents
-- either person from starting or continuing a conversation with the other.
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists "blocked_users_select_participants" on public.blocked_users;
create policy "blocked_users_select_participants" on public.blocked_users
  for select to authenticated
  using ((select auth.uid()) = blocker_id or (select auth.uid()) = blocked_id);

drop policy if exists "blocked_users_insert_own" on public.blocked_users;
create policy "blocked_users_insert_own" on public.blocked_users
  for insert to authenticated
  with check ((select auth.uid()) = blocker_id and blocker_id <> blocked_id);

drop policy if exists "blocked_users_delete_own" on public.blocked_users;
create policy "blocked_users_delete_own" on public.blocked_users
  for delete to authenticated
  using ((select auth.uid()) = blocker_id);

create index if not exists blocked_users_blocked_id_idx on public.blocked_users (blocked_id);

-- A block prevents a new connection in either direction.
drop policy if exists "conn_insert_participants" on public.connections;
create policy "conn_insert_participants" on public.connections
  for insert to authenticated
  with check (
    ((select auth.uid()) = user_a or (select auth.uid()) = user_b)
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = user_a and b.blocked_id = user_b)
         or (b.blocker_id = user_b and b.blocked_id = user_a)
    )
  );

-- A block also stops additional messages in existing conversations.
drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.connections c
      where c.id = connection_id
        and ((select auth.uid()) = c.user_a or (select auth.uid()) = c.user_b)
        and not exists (
          select 1 from public.blocked_users b
          where (b.blocker_id = c.user_a and b.blocked_id = c.user_b)
             or (b.blocker_id = c.user_b and b.blocked_id = c.user_a)
        )
    )
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.charte_accepted = true and p.profile_status = 'active'
    )
  );
