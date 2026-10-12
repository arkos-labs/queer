/*
# Mission flow, search alerts, event submissions, push tokens

1. connections.phone_shared — the provider (user_b) sends their phone once
   the mission is accepted. The number is only readable while the mission
   is 'accepted' (it disappears when completed / cancelled).
2. Admins can close support conversations.
3. Notifications when a mission is accepted / completed.
4. search_alerts — "notify me when someone joins" for an empty category.
5. event_submissions — member suggestions and paid pro events.
6. device_tokens — push notification tokens (iOS).
*/

-- 1. Phone sharing -----------------------------------------------------------
alter table public.connections add column if not exists phone_shared boolean not null default false;

create or replace function public.share_my_phone(conn_id uuid)
returns void as $$
declare
  c public.connections;
  my_phone text;
begin
  select * into c from public.connections where id = conn_id;
  if c.id is null or c.user_b is distinct from auth.uid() then
    raise exception 'Seul le prestataire peut envoyer son numéro.';
  end if;
  if c.status <> 'accepted' then
    raise exception 'La mission doit être acceptée pour envoyer votre téléphone.';
  end if;
  select phone into my_phone from public.profiles where id = auth.uid();
  if my_phone is null or btrim(my_phone) = '' then
    raise exception 'Ajoutez votre téléphone dans votre profil avant de l''envoyer.';
  end if;
  perform set_config('app.share_phone', '1', true);
  update public.connections set phone_shared = true, updated_at = now() where id = conn_id;
end;
$$ language plpgsql security definer set search_path = public;

-- phone_shared can only be flipped through share_my_phone().
create or replace function public.guard_phone_shared()
returns trigger as $$
begin
  if new.phone_shared is distinct from old.phone_shared
     and coalesce(current_setting('app.share_phone', true), '') <> '1'
     and not public.is_admin() then
    new.phone_shared := old.phone_shared;
  end if;
  if new.status in ('completed', 'cancelled') then
    new.phone_shared := false;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists guard_phone_shared on public.connections;
create trigger guard_phone_shared before update on public.connections
  for each row execute function public.guard_phone_shared();

create or replace function public.get_contact_phone(target_profile_id uuid)
returns text as $$
declare
  contact_phone text;
  visible boolean;
begin
  if auth.uid() = target_profile_id or public.is_admin() then
    select phone into contact_phone from public.profiles where id = target_profile_id;
    return contact_phone;
  end if;

  -- Only while the mission is accepted and once the provider sent the number.
  select exists (
    select 1 from public.connections
    where user_a = auth.uid() and user_b = target_profile_id
      and status = 'accepted'
      and phone_shared = true
  ) into visible;

  if visible then
    select phone into contact_phone from public.profiles where id = target_profile_id;
    return contact_phone;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Admin closes support conversations --------------------------------------
drop policy if exists "conn_update_admin_support" on public.connections;
create policy "conn_update_admin_support"
  on public.connections for update
  to authenticated
  using (public.is_admin() and service_label = 'Support Queer Service')
  with check (public.is_admin() and service_label = 'Support Queer Service');

-- 3. Notifications on status changes ------------------------------------------
create or replace function public.handle_connection_status_notification()
returns trigger as $$
declare
  actor_name text;
  recipient uuid;
  msg text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.service_label = 'Support Queer Service' then return new; end if;
  if new.status not in ('accepted', 'completed') then return new; end if;

  select display_name into actor_name from public.profiles where id = auth.uid();
  msg := case new.status
    when 'accepted' then coalesce(actor_name, 'Le prestataire') || ' a accepté votre demande.'
    else 'La mission avec ' || coalesce(actor_name, 'ce membre') || ' est terminée.'
  end;

  for recipient in
    select u from unnest(array[new.user_a, new.user_b]) as u where u is distinct from auth.uid()
  loop
    insert into public.notifications (user_id, type, title, body, action_url, reference_id)
    values (recipient, 'system',
            case new.status when 'accepted' then 'Demande acceptée' else 'Mission terminée' end,
            msg, '/messages/' || new.id, new.id);
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_connection_status_change on public.connections;
create trigger on_connection_status_change after update on public.connections
  for each row execute function public.handle_connection_status_notification();

-- 4. Search alerts --------------------------------------------------------------
create table if not exists public.search_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subcategory_id uuid not null references public.subcategories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, subcategory_id)
);
alter table public.search_alerts enable row level security;

drop policy if exists "search_alerts_own" on public.search_alerts;
create policy "search_alerts_own" on public.search_alerts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_search_alert_match()
returns trigger as $$
declare
  a record;
  member_name text;
  member_status text;
  sub_label text;
begin
  select display_name, profile_status into member_name, member_status from public.profiles where id = new.profile_id;
  if member_status is distinct from 'active' then return new; end if;
  select label into sub_label from public.subcategories where id = new.subcategory_id;

  for a in
    select id, user_id from public.search_alerts
    where subcategory_id = new.subcategory_id and user_id <> new.profile_id
  loop
    insert into public.notifications (user_id, type, title, body, action_url, reference_id)
    values (a.user_id, 'system', 'Un membre correspond à votre recherche',
            member_name || ' propose maintenant « ' || coalesce(sub_label, 'ce service') || ' ».',
            '/profil/' || new.profile_id, new.profile_id);
    delete from public.search_alerts where id = a.id;
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_subcategory_alert on public.profile_subcategories;
create trigger on_profile_subcategory_alert after insert on public.profile_subcategories
  for each row execute function public.handle_search_alert_match();

-- 5. Event submissions ------------------------------------------------------------
create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('suggestion', 'pro_paid')),
  status text not null default 'pending' check (status in ('pending', 'awaiting_payment', 'paid', 'approved', 'rejected')),
  name text not null,
  description text,
  city text not null,
  address text,
  event_date date not null,
  website_url text,
  created_at timestamptz not null default now()
);
alter table public.event_submissions enable row level security;

drop policy if exists "event_submissions_insert_own" on public.event_submissions;
create policy "event_submissions_insert_own" on public.event_submissions
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and status in ('pending', 'awaiting_payment')
    and (kind = 'suggestion' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'pro'))
  );

drop policy if exists "event_submissions_select_own_or_admin" on public.event_submissions;
create policy "event_submissions_select_own_or_admin" on public.event_submissions
  for select to authenticated using (submitted_by = auth.uid() or public.is_admin());

drop policy if exists "event_submissions_update_admin" on public.event_submissions;
create policy "event_submissions_update_admin" on public.event_submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admins publish approved submissions into the agenda.
do $$
begin
  if to_regclass('public.events') is not null then
    drop policy if exists "events_insert_admin" on public.events;
    create policy "events_insert_admin" on public.events
      for insert to authenticated with check (public.is_admin());
  end if;
end $$;

-- 6. Push tokens ---------------------------------------------------------------------
create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'ios',
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens (user_id);
alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens_own" on public.device_tokens;
create policy "device_tokens_own" on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
