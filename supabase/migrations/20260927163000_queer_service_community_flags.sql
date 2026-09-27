alter table public.profiles add column if not exists is_community_member boolean default null;
alter table public.profiles add column if not exists is_ally boolean default false;
