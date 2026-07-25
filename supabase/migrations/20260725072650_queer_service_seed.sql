/*
# Queer Service — Seed reference data

1. Purpose
Populates the reference catalogs used across the platform:
- 8 top-level service categories with their sub-categories (from the spec §4.2).
- 4 trust badges from the spec §4.4 (Safe, Identité vérifiée, Handi-accueillant,
  Inclusif texture & carnation).

2. Tables affected
- `public.categories` — inserted with idempotent upserts keyed on slug.
- `public.subcategories` — inserted with idempotent upserts keyed on
  (category_id, slug).
- `public.badges` — inserted with idempotent upserts keyed on code.

3. Security
No RLS changes; data is read-only for non-admins (policies already exist).

4. Notes
- Uses `ON CONFLICT DO NOTHING` so re-running is safe.
- Slugs are derived from the French labels, kebab-cased.
*/

insert into public.categories (label, slug, icon, sort_order) values
  ('Maison & Dépannage', 'maison-depannage', 'Wrench', 1),
  ('Santé & Bien-être', 'sante-bien-etre', 'HeartPulse', 2),
  ('Administratif & Juridique', 'administratif-juridique', 'Scale', 3),
  ('Beauté & Image', 'beaute-image', 'Scissors', 4),
  ('Éducation & Coaching', 'education-coaching', 'GraduationCap', 5),
  ('Animaux', 'animaux', 'PawPrint', 6),
  ('Transport & Immobilier', 'transport-immobilier', 'Car', 7),
  ('Communauté', 'communaute', 'Users', 8)
on conflict (slug) do nothing;

-- Maison & Dépannage
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Bricolage','bricolage',1),
  ('Plomberie','plomberie',2),
  ('Électricité','electricite',3),
  ('Serrurerie','serrurerie',4),
  ('Peinture','peinture',5),
  ('Jardinage','jardinage',6),
  ('Ménage','menage',7),
  ('Déménagement','demenagement',8),
  ('Montage de meubles','montage-meubles',9),
  ('Informatique à domicile','informatique-domicile',10)
) as s(label, slug, sort_order)
where c.slug = 'maison-depannage'
on conflict (category_id, slug) do nothing;

-- Santé & Bien-être
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Médecins','medecins',1),
  ('Psychologues','psychologues',2),
  ('Psychiatres','psychiatres',3),
  ('Sages-femmes','sages-femmes',4),
  ('Dentistes','dentistes',5),
  ('Kinésithérapeutes','kinesitherapeutes',6),
  ('Ostéopathes','osteopathes',7),
  ('Nutritionnistes','nutritionnistes',8),
  ('Centres de dépistage','centres-depistage',9),
  ('Accompagnement médical','accompagnement-medical',10),
  ('Coachs sportifs','coachs-sportifs',11),
  ('Massages','massages',12)
) as s(label, slug, sort_order)
where c.slug = 'sante-bien-etre'
on conflict (category_id, slug) do nothing;

-- Administratif & Juridique
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Avocats','avocats',1),
  ('Notaires','notaires',2),
  ('Experts-comptables','experts-comptables',3),
  ('Banques','banques',4),
  ('Assurances','assurances',5),
  ('Courtiers','courtiers',6),
  ('Aide administrative','aide-administrative',7),
  ('Traducteurs','traducteurs',8)
) as s(label, slug, sort_order)
where c.slug = 'administratif-juridique'
on conflict (category_id, slug) do nothing;

-- Beauté & Image
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Coiffure (dont cheveux texturés)','coiffure',1),
  ('Esthétique','esthetique',2),
  ('Tatoueurs','tatoueurs',3),
  ('Photographie','photographie',4)
) as s(label, slug, sort_order)
where c.slug = 'beaute-image'
on conflict (category_id, slug) do nothing;

-- Éducation & Coaching
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Cours particuliers','cours-particuliers',1),
  ('Soutien scolaire','soutien-scolaire',2),
  ('Coaching personnel','coaching-personnel',3),
  ('Coaching professionnel','coaching-professionnel',4)
) as s(label, slug, sort_order)
where c.slug = 'education-coaching'
on conflict (category_id, slug) do nothing;

-- Animaux
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Garde d''animaux','garde-animaux',1),
  ('Promenade','promenade',2),
  ('Toilettage','toilettage',3)
) as s(label, slug, sort_order)
where c.slug = 'animaux'
on conflict (category_id, slug) do nothing;

-- Transport & Immobilier
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Transport','transport',1),
  ('Mécanique','mecanique',2),
  ('Agents immobiliers inclusifs','agents-immobiliers',3),
  ('Colocations','colocations',4),
  ('Locations saisonnières','locations-saisonnières',5)
) as s(label, slug, sort_order)
where c.slug = 'transport-immobilier'
on conflict (category_id, slug) do nothing;

-- Communauté
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Soutien moral','soutien-moral',1),
  ('Écoute','ecoute',2),
  ('Commerces recommandés','commerces-recommandes',3),
  ('Associations LGBTQI+','associations-lgbti',4),
  ('Centres de santé','centres-sante',5),
  ('Événements','evenements',6)
) as s(label, slug, sort_order)
where c.slug = 'communaute'
on conflict (category_id, slug) do nothing;

-- Badges
insert into public.badges (code, label, description, icon) values
  ('safe', 'Safe', 'Attribué automatiquement après plusieurs avis positifs et respect de la charte.', 'ShieldCheck'),
  ('identite-verifiee', 'Identité vérifiée', 'Attribué après vérification CNI + vivacité via prestataire tiers certifié.', 'BadgeCheck'),
  ('handi-accueillant', 'Handi-accueillant', 'Auto-déclaration + confirmation par avis : accueil sans discrimination du handicap.', 'Accessibility'),
  ('inclusif-texture', 'Inclusif texture & carnation', 'Pour les métiers de la beauté : compétence avérée sur cheveux texturés et peaux métissées.', 'Sparkles')
on conflict (code) do nothing;
