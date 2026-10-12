/*
# Account verification without ID documents

A member is "verified" once they entered the one-time code received by e-mail
(proof stored in profiles.email_code_verified_at). No ID document, no SMS. Members cannot set these fields themselves:
only mark_email_code_verified() / refresh_my_verification() or an admin can.
*/

alter table public.profiles add column if not exists email_code_verified_at timestamptz;

-- Called right after the code was entered: the session then carries an
-- 'otp' authentication method, which proves the code was used.
create or replace function public.mark_email_code_verified()
returns text as $$
declare
  used_code boolean;
begin
  if auth.uid() is null then return null; end if;
  select exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) a
    where a ->> 'method' in ('otp', 'magiclink')
  ) into used_code;

  if used_code then
    perform set_config('app.verify', '1', true);
    update public.profiles
      set email_code_verified_at = coalesce(email_code_verified_at, now())
      where id = auth.uid();
  end if;
  return public.refresh_my_verification();
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.refresh_my_verification()
returns text as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then return null; end if;

  if p.email_code_verified_at is not null and p.verification_status <> 'verified' then
    perform set_config('app.verify', '1', true);
    update public.profiles
      set verification_status = 'verified', verified_at = now()
      where id = auth.uid();
    return 'verified';
  end if;
  return p.verification_status;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.guard_verification_status()
returns trigger as $$
begin
  if coalesce(current_setting('app.verify', true), '') <> '1' and not public.is_admin() then
    if new.verification_status is distinct from old.verification_status and new.verification_status = 'verified' then
      new.verification_status := old.verification_status;
      new.verified_at := old.verified_at;
    end if;
    new.email_code_verified_at := old.email_code_verified_at;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists guard_verification_status on public.profiles;
create trigger guard_verification_status before update on public.profiles
  for each row execute function public.guard_verification_status();

-- New profiles can never start out verified.
create or replace function public.guard_verification_insert()
returns trigger as $$
begin
  if coalesce(current_setting('app.verify', true), '') <> '1' and not public.is_admin() then
    new.verification_status := 'none';
    new.verified_at := null;
    new.email_code_verified_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists guard_verification_insert on public.profiles;
create trigger guard_verification_insert before insert on public.profiles
  for each row execute function public.guard_verification_insert();
