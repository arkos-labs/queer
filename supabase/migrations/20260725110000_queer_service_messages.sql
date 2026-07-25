/*
# Queer Service — Internal messaging (real conversations on connections)

1. Purpose
Adds real back-and-forth messaging on top of the existing `connections`
("mise en relation") table. Until now a connection only carried a single
`service_label` (the opening message) with no reply mechanism. This adds
a `messages` table so both participants can actually converse, and a
trigger that bumps `connections.updated_at` on every new message so
conversation lists can be sorted by recency.

2. New table
- `public.messages` — one row per chat message, tied to a `connection_id`.
  `read_at` supports unread badges / read receipts.

3. Security (RLS)
- RLS enabled. Only the two participants of a connection can see or send
  messages on it (checked via an EXISTS subquery on `connections`).
- Sending a message additionally requires the sender to have accepted the
  community charter and have an active profile — enforcing, at the
  database level, the rule already stated in onboarding copy ("charter
  acceptance conditions access to messaging").
- Only the recipient (not the sender) can mark a message as read.

4. Notes
- `messages_touch_connection` trigger keeps `connections.updated_at`
  current so the conversation list can `order by updated_at desc`.
- No `on delete cascade` surprises: deleting a connection removes its
  messages; deleting a profile cascades through `connections` already.
*/

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages for select
  to authenticated using (
    exists (
      select 1 from public.connections c
      where c.id = connection_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
  on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = connection_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.charte_accepted = true and p.profile_status = 'active'
    )
  );

drop policy if exists "messages_update_mark_read" on public.messages;
create policy "messages_update_mark_read"
  on public.messages for update
  to authenticated using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = connection_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = connection_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create index if not exists messages_connection_id_idx on public.messages (connection_id);
create index if not exists messages_created_at_idx on public.messages (created_at);

-- Bump the parent connection's updated_at whenever a message is sent, so
-- conversation lists can sort by recency without a client-side round trip.
create or replace function public.touch_connection_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.connections set updated_at = now() where id = new.connection_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_connection on public.messages;
create trigger messages_touch_connection
  after insert on public.messages
  for each row execute function public.touch_connection_on_message();
