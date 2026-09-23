/*
# Public directory preview (anonymized, unauthenticated access)

1. Purpose
Lets logged-out visitors — including search engine crawlers, which are
never authenticated — browse an anonymized preview of the directory, so
`/annuaire` and its per-category pages can actually be indexed by Google.
Full identity (real display name, photo, email, phone, bio) stays
member-only; you have to sign in to see or contact anyone.

2. Why a view instead of an anon RLS policy on `profiles`
RLS is row-level, not column-level. An anon SELECT policy on `profiles`
would still let anyone craft a request that reads every column — email,
phone, photo_url, bio. This view is a fixed column allowlist; `profiles`
itself keeps its existing authenticated-only policies untouched. The view
is created without `security_invoker`, so it (deliberately) reads through
profiles/reviews/profile_subcategories with the view owner's rights —
the view's SELECT list is the only access-control boundary anon gets.

3. What's exposed to anon
id, first-letter initial (never the full display name), city, account
type, skills, verification status, aggregated rating, and the ids of
subcategories offered. Enough to render a "J. · Lyon · Ménage · ★4.8"
card and a "se connecter pour voir le profil complet" CTA.

4. categories / subcategories
No PII in these tables (they're already shipped hardcoded in the client
bundle as FALLBACK_CATEGORIES/FALLBACK_SUBCATEGORIES — see src/lib/taxonomy.ts),
so it's safe to let anon read them directly instead of duplicating them in
the view.
*/

create or replace view public.public_directory_listings as
select
  p.id,
  left(p.display_name, 1) || '.' as display_initial,
  p.city,
  p.account_type,
  p.skills,
  p.verification_status,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
  count(distinct r.id) as review_count,
  coalesce(
    array_agg(distinct ps.subcategory_id) filter (where ps.subcategory_id is not null),
    '{}'
  ) as subcategory_ids
from public.profiles p
left join public.reviews r on r.target_id = p.id
left join public.profile_subcategories ps on ps.profile_id = p.id
where p.profile_status = 'active'
group by p.id;

grant select on public.public_directory_listings to anon;

drop policy if exists "categories_select_anon" on public.categories;
create policy "categories_select_anon"
  on public.categories for select
  to anon using (true);

drop policy if exists "subcategories_select_anon" on public.subcategories;
create policy "subcategories_select_anon"
  on public.subcategories for select
  to anon using (true);
