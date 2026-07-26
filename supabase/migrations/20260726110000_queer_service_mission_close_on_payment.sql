-- Don't close a mission just because the poster accepted one applicant's
-- price — nothing has actually been committed yet at that point (no card
-- charged, no hold placed), so other candidates should still be able to
-- apply and offer a better rate while the deal is still just a verbal/price
-- agreement. The mission should only disappear from the board once payment
-- has actually been engaged, i.e. once the card is authorized (a real hold
-- placed on funds via stripe-create-payment + PayNowModal confirmation).
--
-- Applications with no price/payment attached at all (rate left blank in
-- ApplyToMissionModal) have nothing to wait for, so those still close the
-- mission immediately on acceptance, same as before.

create or replace function public.close_mission_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and new.mission_request_id is not null
     and not exists (select 1 from public.payments where connection_id = new.id) then
    update public.mission_requests
      set status = 'closed', updated_at = timezone('utc'::text, now())
      where id = new.mission_request_id and status = 'open';
  end if;
  return new;
end;
$$;

create or replace function public.close_mission_on_payment_authorized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_request_id uuid;
begin
  if new.status = 'authorized' and old.status is distinct from new.status then
    select mission_request_id into v_mission_request_id
      from public.connections where id = new.connection_id;

    if v_mission_request_id is not null then
      update public.mission_requests
        set status = 'closed', updated_at = timezone('utc'::text, now())
        where id = v_mission_request_id and status = 'open';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists close_mission_on_payment_authorize on public.payments;
create trigger close_mission_on_payment_authorize
  after update of status on public.payments
  for each row
  execute function public.close_mission_on_payment_authorized();
