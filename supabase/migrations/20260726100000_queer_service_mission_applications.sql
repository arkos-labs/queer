-- Link connections to the mission_request they were opened from (via
-- "Postuler" on the missions board), and auto-close the mission once
-- the poster accepts one of its applicants — it should stop showing up
-- as looking for a provider.

alter table public.connections
  add column if not exists mission_request_id uuid references public.mission_requests(id) on delete set null;

create or replace function public.close_mission_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and new.mission_request_id is not null then
    update public.mission_requests
      set status = 'closed', updated_at = timezone('utc'::text, now())
      where id = new.mission_request_id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists close_mission_on_connection_accept on public.connections;
create trigger close_mission_on_connection_accept
  after update of status on public.connections
  for each row
  execute function public.close_mission_on_accept();
