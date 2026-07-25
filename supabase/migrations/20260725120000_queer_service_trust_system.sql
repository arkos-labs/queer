/*
# Queer Service — Trust & safety system

1. Purpose
Backs the 5-point trust panel shown on every profile:
  ✅ Identité vérifiée · 🏳️‍🌈 Charte acceptée · ⭐ Avis de la communauté ·
  📅 Dernière vérification · 🛡️ Badge "Safe"
Most of this already existed (verification_status, charte_accepted,
reviews) but two gaps needed closing:
  a) there was no timestamp for *when* a profile was last verified;
  b) `profile_badges` could be written by its own owner, meaning any
     member could grant themselves the "Safe" or any other trust badge —
     defeating the point of a trust system.

2. Changes
- `profiles.verified_at` — set by an admin when they verify identity.
- `profile_badges` write access is now admin-only (select unchanged).
- `award_safe_badge()` — SECURITY DEFINER trigger on `reviews` insert that
  automatically grants the "Safe" badge once a profile has accumulated
  3+ reviews averaging 4★ or better and has accepted the charter. Runs
  with elevated privileges specifically so this automated, rule-based
  award can bypass the now-stricter admin-only RLS — members still can't
  award it to themselves directly.

3. Security
- `profile_badges` insert/update/delete: admin-only from now on.
- `award_safe_badge()` uses `security definer` + a pinned `search_path`
  (avoids search-path hijacking) and only ever inserts the fixed 'safe'
  badge — it cannot be used to grant arbitrary badges.

4. Notes
- Badges are sticky achievements: this trigger only *awards*, it never
  revokes (consistent with how the "Safe" badge is described in the seed
  data). Manual removal remains available to admins via the existing
  admin-only delete policy.
*/

alter table public.profiles add column if not exists verified_at timestamptz;

-- Tighten profile_badges: only admins may grant/revoke badges directly.
drop policy if exists "pb_write_own_or_admin" on public.profile_badges;

drop policy if exists "pb_write_admin_only" on public.profile_badges;
create policy "pb_write_admin_only"
  on public.profile_badges for all
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- Auto-award the "Safe" badge once a profile earns 3+ reviews averaging >= 4.
create or replace function public.award_safe_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_avg numeric;
  v_charte_ok boolean;
  v_badge_id uuid;
begin
  select count(*), coalesce(avg(rating), 0)
    into v_count, v_avg
    from public.reviews
    where target_id = new.target_id;

  select charte_accepted into v_charte_ok
    from public.profiles
    where id = new.target_id;

  if v_count >= 3 and v_avg >= 4.0 and coalesce(v_charte_ok, false) then
    select id into v_badge_id from public.badges where code = 'safe';
    if v_badge_id is not null then
      insert into public.profile_badges (profile_id, badge_id, source_rule)
      values (new.target_id, v_badge_id, 'auto: 3+ avis, moyenne >= 4')
      on conflict (profile_id, badge_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_award_safe_badge on public.reviews;
create trigger reviews_award_safe_badge
  after insert on public.reviews
  for each row execute function public.award_safe_badge();
