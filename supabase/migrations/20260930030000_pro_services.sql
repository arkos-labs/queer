-- Services d'un compte pro : [{ "subcategory_id": uuid|null, "label": text, "price": text }]
-- Le tarif est facultatif (chaîne vide ou absent).
alter table public.profiles add column if not exists pro_services jsonb not null default '[]'::jsonb;

-- Le compte admin n'apparaît pas dans l'annuaire public.
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
  ) as subcategory_ids,
  case when p.account_type = 'pro' then p.company_name end as company_name
from public.profiles p
left join public.reviews r on r.target_id = p.id
left join public.profile_subcategories ps on ps.profile_id = p.id
where p.profile_status = 'active' and not p.is_admin
  and p.email is distinct from 'contact@queerservices.fr'
group by p.id;

grant select on public.public_directory_listings to anon;
