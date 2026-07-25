/*
# Queer Service — Core schema (MVP)

1. Purpose
Core data model for Queer Service, a community platform where LGBT+ members
exchange services. Covers: user profiles (member / professional / association),
service categories and sub-categories, trust badges, member-to-member reviews,
connections (mise en relation) and content/profile reports for moderation.

2. New tables
- `profiles` — one row per authenticated user (extends auth.users). Community
  identity: civilité, pronoms, account type, bio, photo, city, skills, needs,
  professional fields, charte acceptance, verification state, admin flag.
- `categories` — top-level service categories (8 seeded separately).
- `subcategories` — child services under a category.
- `profile_subcategories` — services a given member offers (many-to-many).
- `badges` — catalog of trust badges.
- `profile_badges` — badges awarded to a profile, with the rule that granted it.
- `connections` — a "mise en relation" between two users for a service.
- `reviews` — rating + comment left by one user for another, tied to a
  connection. Double-sided (client <-> prestataire).
- `reports` — moderation reports against a profile, review or message.

3. Security (RLS)
- RLS enabled on every table.
- `profiles`: authenticated SELECT (community directory); owner INSERT/UPDATE/
  DELETE; admin may also UPDATE.
- `categories`, `subcategories`, `badges`: authenticated SELECT; admin-only
  writes via the `is_admin()` helper.
- `profile_subcategories`, `profile_badges`: authenticated SELECT; owner (or
  admin) writes.
- `connections`: participants-only SELECT/INSERT/UPDATE/DELETE.
- `reviews`: authenticated SELECT; author-only INSERT/UPDATE/DELETE.
- `reports`: authenticated INSERT (reporter); reporter-or-admin SELECT;
  admin-only UPDATE.

4. Important notes
- `profiles.id` references `auth.users(id)` ON DELETE CASCADE, so the profile
  id IS the auth uid. Ownership checks use `auth.uid() = id`.
- `is_admin()` is defined right after the `profiles` table so policies that
  reference it resolve at creation time.
- Geolocation is a text city for the MVP; full geo/map features are V2.
- All timestamps are timestamptz defaulting to now().
*/

-- profiles (table first, before the is_admin() helper that reads it)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  civilite text check (civilite in ('Monsieur','Madame','Iel')),
  pronouns text,
  account_type text not null default 'particulier' check (account_type in ('particulier','pro','asso')),
  bio text,
  photo_url text,
  city text,
  skills text[] not null default '{}',
  needs text[] not null default '{}',
  siret text,
  service_category text,
  intervention_zone text,
  indicative_rates text,
  charte_accepted boolean not null default false,
  charte_accepted_at timestamptz,
  verification_status text not null default 'none' check (verification_status in ('none','pending','verified','rejected')),
  profile_status text not null default 'active' check (profile_status in ('active','suspended','banned','pending')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper: is the current authenticated user an admin? (defined before any policy uses it)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Now enable RLS and policies on profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all_authenticated" on public.profiles;
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated using (auth.uid() = id);

-- categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  slug text not null unique,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated using (true);

drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin"
  on public.categories for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- subcategories
create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  label text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

alter table public.subcategories enable row level security;

drop policy if exists "subcategories_select_authenticated" on public.subcategories;
create policy "subcategories_select_authenticated"
  on public.subcategories for select
  to authenticated using (true);

drop policy if exists "subcategories_write_admin" on public.subcategories;
create policy "subcategories_write_admin"
  on public.subcategories for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- profile_subcategories (services offered by a profile)
create table if not exists public.profile_subcategories (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subcategory_id uuid not null references public.subcategories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, subcategory_id)
);

alter table public.profile_subcategories enable row level security;

drop policy if exists "psc_select_authenticated" on public.profile_subcategories;
create policy "psc_select_authenticated"
  on public.profile_subcategories for select
  to authenticated using (true);

drop policy if exists "psc_write_own" on public.profile_subcategories;
create policy "psc_write_own"
  on public.profile_subcategories for all
  to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- badges
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

drop policy if exists "badges_select_authenticated" on public.badges;
create policy "badges_select_authenticated"
  on public.badges for select
  to authenticated using (true);

drop policy if exists "badges_write_admin" on public.badges;
create policy "badges_write_admin"
  on public.badges for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- profile_badges
create table if not exists public.profile_badges (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  source_rule text,
  primary key (profile_id, badge_id)
);

alter table public.profile_badges enable row level security;

drop policy if exists "pb_select_authenticated" on public.profile_badges;
create policy "pb_select_authenticated"
  on public.profile_badges for select
  to authenticated using (true);

drop policy if exists "pb_write_own_or_admin" on public.profile_badges;
create policy "pb_write_own_or_admin"
  on public.profile_badges for all
  to authenticated using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

-- connections (mise en relation)
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  service_label text,
  status text not null default 'pending' check (status in ('pending','accepted','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connections enable row level security;

drop policy if exists "conn_select_participants" on public.connections;
create policy "conn_select_participants"
  on public.connections for select
  to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "conn_insert_participants" on public.connections;
create policy "conn_insert_participants"
  on public.connections for insert
  to authenticated with check (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "conn_update_participants" on public.connections;
create policy "conn_update_participants"
  on public.connections for update
  to authenticated using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "conn_delete_participants" on public.connections;
create policy "conn_delete_participants"
  on public.connections for delete
  to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

-- reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid references public.connections(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_authenticated" on public.reviews;
create policy "reviews_select_authenticated"
  on public.reviews for select
  to authenticated using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated with check (auth.uid() = author_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
  on public.reviews for update
  to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  to authenticated using (auth.uid() = author_id);

-- reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile','review','message')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  handled_by uuid references public.profiles(id) on delete set null,
  resolution_note text
);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
  on public.reports for insert
  to authenticated with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin"
  on public.reports for select
  to authenticated using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- indexes for directory filtering
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_account_type_idx on public.profiles (account_type);
create index if not exists reviews_target_idx on public.reviews (target_id);
create index if not exists connections_user_a_idx on public.connections (user_a);
create index if not exists connections_user_b_idx on public.connections (user_b);
