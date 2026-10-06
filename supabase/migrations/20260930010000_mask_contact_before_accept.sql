/*
# Mask phone numbers, e-mails and addresses until the mission is accepted

While a connection is still 'pending' (the client has not chosen who will do
the job), any phone number, e-mail or street address typed in a message is
replaced by asterisks before the message is stored. Support conversations
are not affected. After acceptance messages are stored as typed.
*/

create or replace function public.mask_contact_text(t text)
returns text as $$
declare
  patterns text[] := array[
    '(\+?[0-9](?:[ .-]?[0-9]){8,})',
    '([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)',
    '(?:^|[^[:alnum:]])((?:[0-9]{1,4} ?(?:bis|ter)? ?,? ?)?(?:rue|avenue|av\.?|boulevard|bd|impasse|allée|allee|chemin|quai)(?=[ ,.;:!?)]|$)(?: +[[:alnum:]''’-]+){1,4})',
    '(?:^|[^[:alnum:]])([0-9]{1,4} ?(?:bis|ter)? ?,? +(?:place|route|cours|square|passage|villa|résidence|residence)(?=[ ,.;:!?)]|$)(?: +[[:alnum:]''’-]+){1,4})'
  ];
  p text;
  m text[];
  result text := t;
begin
  if t is null then return t; end if;
  foreach p in array patterns loop
    for m in select regexp_matches(result, p, 'gi') loop
      result := replace(result, m[1], regexp_replace(m[1], '[^[:space:]]', '*', 'g'));
    end loop;
  end loop;
  return result;
end;
$$ language plpgsql immutable;

create or replace function public.mask_contact_before_accept()
returns trigger as $$
declare
  c record;
begin
  select status, service_label into c from public.connections where id = new.connection_id;
  if c.status = 'pending' and coalesce(c.service_label, '') <> 'Support Queer Service' then
    new.body := public.mask_contact_text(new.body);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists mask_contact_before_accept on public.messages;
create trigger mask_contact_before_accept before insert on public.messages
  for each row execute function public.mask_contact_before_accept();
