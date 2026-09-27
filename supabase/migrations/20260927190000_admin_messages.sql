/*
# Admin messages access - Only on reports

1. Purpose
Allows admins to view connections and messages ONLY if one of the users was reported, or a message in the connection was reported.
Allows admins to send messages in such connections.
*/

create or replace function public.admin_can_view_connection(conn_id uuid, u_a uuid, u_b uuid)
returns boolean as $$
begin
  if not public.is_admin() then
    return false;
  end if;

  -- Can view if either user has been reported
  if exists (
    select 1 from public.reports 
    where target_type = 'profile' and target_id in (u_a, u_b)
  ) then
    return true;
  end if;

  -- Can view if a message in this connection was reported
  if exists (
    select 1 from public.reports r
    join public.messages m on r.target_id = m.id
    where r.target_type = 'message' and m.connection_id = conn_id
  ) then
    return true;
  end if;

  return false;
end;
$$ language plpgsql security definer;


-- Connections
drop policy if exists "conn_select_participants_or_admin" on public.connections;
drop policy if exists "conn_select_participants" on public.connections;
create policy "conn_select_participants"
  on public.connections for select
  to authenticated using (
    auth.uid() = user_a 
    or auth.uid() = user_b 
    or public.admin_can_view_connection(id, user_a, user_b)
  );

-- Messages
drop policy if exists "messages_select_participants_or_admin" on public.messages;
drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages for select
  to authenticated using (
    exists (
      select 1 from public.connections c
      where c.id = connection_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or public.admin_can_view_connection(c.id, c.user_a, c.user_b))
    )
  );

drop policy if exists "messages_insert_participants_or_admin" on public.messages;
drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
  on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = connection_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or public.admin_can_view_connection(c.id, c.user_a, c.user_b))
    )
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.charte_accepted = true and p.profile_status = 'active'
      )
      or public.is_admin()
    )
  );
