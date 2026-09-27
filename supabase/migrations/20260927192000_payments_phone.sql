/*
# Payment and contact info access

1. Purpose
Adds an `is_paid` column to the `connections` table.
Adds a secure function to fetch a user's phone number only if there is a paid connection.
*/

alter table public.connections add column if not exists is_paid boolean not null default false;

create or replace function public.get_contact_phone(target_profile_id uuid)
returns text as $$
declare
  contact_phone text;
  has_paid_connection boolean;
begin
  -- 1. If it's the user themselves or an admin, allow.
  if auth.uid() = target_profile_id or public.is_admin() then
    select phone into contact_phone from public.profiles where id = target_profile_id;
    return contact_phone;
  end if;

  -- 2. Check if there is an accepted and paid connection between auth.uid() and target_profile_id
  select exists (
    select 1 from public.connections
    where ( (user_a = auth.uid() and user_b = target_profile_id)
         or (user_a = target_profile_id and user_b = auth.uid()) )
      and is_paid = true
  ) into has_paid_connection;

  if has_paid_connection then
    select phone into contact_phone from public.profiles where id = target_profile_id;
    return contact_phone;
  end if;

  return null;
end;
$$ language plpgsql security definer;
