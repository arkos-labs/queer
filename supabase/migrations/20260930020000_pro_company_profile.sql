/*
# Fiche entreprise pour les comptes professionnels

Les comptes `pro` peuvent renseigner leur structure (nom, SIRET, description,
site web, horaires) pour se distinguer des particuliers.
`siret` existe déjà sur `profiles`.

La vue publique n'expose que le nom de la structure (jamais un nom de
personne) et uniquement pour les comptes pro.
*/

alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists company_description text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists opening_hours text;

alter table public.profiles drop constraint if exists profiles_siret_format;
alter table public.profiles add constraint profiles_siret_format
  check (siret is null or siret ~ '^[0-9]{14}$') not valid;

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
where p.profile_status = 'active'
group by p.id;

grant select on public.public_directory_listings to anon;
