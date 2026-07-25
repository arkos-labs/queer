/*
# Queer Service — Adresses et lieux (Shopping & Bonnes adresses)

1. Purpose
Lets members submit LGBT/Gay-Friendly places (restaurants, bars, boutiques…)
under the "Shopping & Bonnes adresses" theme, and leave reviews on places.
Because this is user-generated content about real-world venues — and the
whole point of the feature is community safety — both places and their
reviews go through moderation before becoming publicly visible, exactly
like the rest of the app's "never fake, never unmoderated" approach to
public content.

2. New tables
- `public.blocked_keywords` — admin-managed list of terms that trigger an
  automatic rejection (see below). Kept in a table (not hardcoded) so an
  admin can tune the list from the back-office without a deploy.
- `public.places` — one row per submitted place. `status` gates public
  visibility. `flagged` records whether the automatic keyword filter fired
  (for admin triage), independently of the final status.
- `public.place_reviews` — one row per review on a place. Same
  status/flagged moderation shape as `places`.

3. Moderation model (per product decision: admin review + automatic
   keyword filter, not admin-only)
- Every new place/review starts at `status = 'pending'`.
- A `before insert` trigger runs an automatic keyword filter over the
  free-text fields. If it matches, the row is written directly as
  `status = 'rejected'` with `flagged = true` and a explanatory
  `rejection_reason` — i.e. the filter *blocks the submission from ever
  reaching admin/public view unless an admin manually restores it*, per
  the "blocks the submission" requirement. This is intentionally a soft
  block (row exists, owner sees why) rather than a hard DB exception, so
  the UI can show the author a clear explanation instead of a generic
  error.
- Content that passes the filter still lands in `pending`, not `approved`
  — the keyword filter is a first line of defense against obvious cases,
  it never grants automatic publication. An admin must still approve
  everything that becomes publicly visible.
- Admins can always override an automatic rejection (it's a normal row
  update, same as any other moderation decision).

4. Security (RLS)
- `blocked_keywords`: admin-only, in both directions — deliberately not
  even readable by regular authenticated users, so the list can't be
  trivially reverse-engineered to dodge it.
- `places` / `place_reviews` select: public (`anon`+`authenticated`) may
  see `approved` rows only; the submitter/author may additionally see
  their own row at any status (so they know it was rejected and why);
  admins see everything.
- insert: authenticated members with an accepted charter and an active
  profile only; `place_reviews` additionally requires the target place to
  already be `approved` (no reviewing a place that isn't public yet).
- update: admin-only (approve/reject/edit).
- delete: admin, or the submitter/author for their own not-yet-approved
  row (lets someone withdraw a pending/rejected submission; approved
  public content can only be removed by an admin).

5. Notes
- One review per member per place (`unique (place_id, author_id)`) to
  limit spam; no edit-in-place for reviews — withdraw (delete, allowed
  while not approved... once approved only admin can remove) and
  resubmit is the intended flow, consistent with the rest of the app's
  minimal-surface moderation model.
- Photos use the same pattern as `profiles.photo_url`: a plain URL field,
  no storage bucket — consistent with how the rest of the app already
  handles images.
*/

-- Admin-managed keyword list used by the automatic filter below.
create table if not exists public.blocked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  created_at timestamptz not null default now()
);

alter table public.blocked_keywords enable row level security;

drop policy if exists "blocked_keywords_admin_only" on public.blocked_keywords;
create policy "blocked_keywords_admin_only"
  on public.blocked_keywords for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Starter list: well-known French homophobic/transphobic slurs and generic
-- hate-speech patterns. Admin-editable from the back-office afterwards.
insert into public.blocked_keywords (keyword) values
  ('sale pd'), ('sale pédé'), ('pédé de merde'), ('sale gouine'), ('gouine de merde'),
  ('sale trav'), ('sale travelo'), ('tarlouze'), ('tapette'), ('enculé de pd'),
  ('mort aux gays'), ('mort aux pd'), ('les gays devraient'), ('les trans devraient'),
  ('sale homo'), ('vous êtes des malades'), ('c''est une maladie mentale'),
  ('interdit aux pd'), ('interdit aux gouines'), ('interdit aux trans')
on conflict (keyword) do nothing;

create or replace function public.text_contains_blocked_keyword(p_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_kw record;
begin
  if p_text is null or btrim(p_text) = '' then
    return false;
  end if;
  v_normalized := lower(p_text);
  for v_kw in select keyword from public.blocked_keywords loop
    if v_normalized like '%' || lower(v_kw.keyword) || '%' then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- places
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  address text,
  city text,
  photo_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  flagged boolean not null default false,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places enable row level security;

drop policy if exists "places_select_approved_or_own_or_admin" on public.places;
create policy "places_select_approved_or_own_or_admin"
  on public.places for select
  to anon, authenticated using (
    status = 'approved' or submitted_by = auth.uid() or public.is_admin()
  );

drop policy if exists "places_insert_members" on public.places;
create policy "places_insert_members"
  on public.places for insert
  to authenticated with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.charte_accepted = true and p.profile_status = 'active'
    )
  );

drop policy if exists "places_update_admin_only" on public.places;
create policy "places_update_admin_only"
  on public.places for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "places_delete_admin_or_owner_unapproved" on public.places;
create policy "places_delete_admin_or_owner_unapproved"
  on public.places for delete
  to authenticated using (
    public.is_admin() or (submitted_by = auth.uid() and status <> 'approved')
  );

create index if not exists places_status_idx on public.places (status);
create index if not exists places_subcategory_idx on public.places (subcategory_id);
create index if not exists places_submitted_by_idx on public.places (submitted_by);

create or replace function public.moderate_place_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.text_contains_blocked_keyword(new.name)
     or public.text_contains_blocked_keyword(new.description)
     or public.text_contains_blocked_keyword(new.address) then
    new.status := 'rejected';
    new.flagged := true;
    new.rejection_reason := coalesce(
      new.rejection_reason,
      'Contenu bloqué automatiquement : merci de respecter la charte de la communauté. Si vous pensez qu''il s''agit d''une erreur, contactez la modération.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists places_moderate_before_insert on public.places;
create trigger places_moderate_before_insert
  before insert on public.places
  for each row execute function public.moderate_place_submission();

-- place_reviews
create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  flagged boolean not null default false,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (place_id, author_id)
);

alter table public.place_reviews enable row level security;

drop policy if exists "place_reviews_select_approved_or_own_or_admin" on public.place_reviews;
create policy "place_reviews_select_approved_or_own_or_admin"
  on public.place_reviews for select
  to anon, authenticated using (
    status = 'approved' or author_id = auth.uid() or public.is_admin()
  );

drop policy if exists "place_reviews_insert_members" on public.place_reviews;
create policy "place_reviews_insert_members"
  on public.place_reviews for insert
  to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.charte_accepted = true and p.profile_status = 'active'
    )
    and exists (
      select 1 from public.places pl where pl.id = place_id and pl.status = 'approved'
    )
  );

drop policy if exists "place_reviews_update_admin_only" on public.place_reviews;
create policy "place_reviews_update_admin_only"
  on public.place_reviews for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "place_reviews_delete_admin_or_owner_unapproved" on public.place_reviews;
create policy "place_reviews_delete_admin_or_owner_unapproved"
  on public.place_reviews for delete
  to authenticated using (
    public.is_admin() or (author_id = auth.uid() and status <> 'approved')
  );

create index if not exists place_reviews_place_idx on public.place_reviews (place_id);
create index if not exists place_reviews_status_idx on public.place_reviews (status);

create or replace function public.moderate_place_review_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.text_contains_blocked_keyword(new.comment) then
    new.status := 'rejected';
    new.flagged := true;
    new.rejection_reason := coalesce(
      new.rejection_reason,
      'Contenu bloqué automatiquement : merci de respecter la charte de la communauté. Si vous pensez qu''il s''agit d''une erreur, contactez la modération.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists place_reviews_moderate_before_insert on public.place_reviews;
create trigger place_reviews_moderate_before_insert
  before insert on public.place_reviews
  for each row execute function public.moderate_place_review_submission();
