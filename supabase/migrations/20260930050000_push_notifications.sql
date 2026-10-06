/*
# Push notifications (iPhone verrouillé / app fermée)

1. Chaque nouvelle ligne de public.notifications déclenche l'Edge Function
   send-push, qui envoie la notification via APNs (voir supabase/functions/send-push).
2. Un nouvel événement publié notifie tous les membres actifs.
Les messages, demandes acceptées, avis et messages de l'administrateur créent déjà
des lignes dans notifications (triggers existants).
*/

create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger as $$
begin
  begin
    perform net.http_post(
      url := 'https://ovufzlswycrvadckhysi.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dWZ6bHN3eWNydmFkY2toeXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NzUzMDUsImV4cCI6MjEwMDU1MTMwNX0.6uU23Br-WIsOPdW-HD2LH_yUep2oLaxXa2sLY2tNUOA'
      ),
      body := jsonb_build_object('record', to_jsonb(new))
    );
  exception when others then
    null; -- une panne de push ne doit jamais bloquer l'enregistrement de la notification
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions, net;

drop trigger if exists push_on_notification on public.notifications;
create trigger push_on_notification after insert on public.notifications
  for each row execute function public.push_on_notification();

-- Nouvel événement publié -> notification pour tous les membres actifs.
create or replace function public.notify_new_event()
returns trigger as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications (user_id, type, title, body, action_url, reference_id)
    select p.id, 'system', 'Nouvel événement',
           new.name || ' · ' || new.city, '/evenements', new.id
    from public.profiles p
    where p.profile_status = 'active';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists notify_new_event on public.events;
create trigger notify_new_event after insert or update of status on public.events
  for each row execute function public.notify_new_event();
