-- Adds the app's tables to the Supabase realtime publication (safe to re-run).
-- `profiles` is intentionally excluded: realtime payloads contain every column.
do $$
declare
  t text;
begin
  foreach t in array array[
    'messages', 'connections', 'notifications', 'events',
    'mission_requests', 'mission_applications', 'profile_subcategories',
    'reviews', 'event_submissions'
  ] loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
