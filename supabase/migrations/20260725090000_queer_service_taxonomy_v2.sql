/*
# Queer Service — Taxonomy v2 (6 grands thèmes)

1. Purpose
Replaces the initial 8-category seed with the community's final taxonomy:
6 top-level themes, each with their sub-categories, as specified by the
product owner. Categories/subcategories power both the "Services proposés"
picker (profile edit) and the directory browse/filter tabs — both already
read live from these tables, so no application code change is required
beyond this data.

2. Tables affected
- `public.categories` — cleared and re-seeded with the 6 themes.
- `public.subcategories` — cleared and re-seeded (cascades from category
  delete, then re-inserted).

3. Security
No RLS changes; policies from the core schema migration still apply
(authenticated SELECT, admin-only writes).

4. Notes
- Safe to re-run: it clears then re-inserts, keyed by slug.
- `profile_subcategories` rows pointing at the old sub-categories are
  removed automatically via the `on delete cascade` foreign key — expected
  during this pre-launch taxonomy revision.
- Icons reference lucide-react component names, resolved client-side.
*/

delete from public.subcategories;
delete from public.categories;

insert into public.categories (label, slug, icon, sort_order) values
  ('Maison & Dépannage', 'maison-depannage', 'Home', 1),
  ('Santé & Bien-être', 'sante-bien-etre', 'HeartPulse', 2),
  ('Professionnels & Administratif', 'professionnels-administratif', 'Briefcase', 3),
  ('Shopping & Bonnes adresses', 'shopping-bonnes-adresses', 'ShoppingBag', 4),
  ('Services entre particuliers', 'services-entre-particuliers', 'Handshake', 5),
  ('Communauté & Vie LGBTQ+', 'communaute-vie-lgbtq', 'Users', 6);

-- 1. Maison & Dépannage
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Montage de meubles','montage-meubles',1),
  ('Bricolage','bricolage',2),
  ('Plomberie','plomberie',3),
  ('Électricité','electricite',4),
  ('Serrurerie','serrurerie',5),
  ('Peinture','peinture',6),
  ('Jardinage','jardinage',7),
  ('Ménage','menage',8),
  ('Déménagement','demenagement',9),
  ('Nettoyage','nettoyage',10),
  ('Informatique à domicile','informatique-domicile',11)
) as s(label, slug, sort_order)
where c.slug = 'maison-depannage';

-- 2. Santé & Bien-être
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Médecins généralistes','medecins-generalistes',1),
  ('Gynécologues','gynecologues',2),
  ('Urologues','urologues',3),
  ('Sages-femmes','sages-femmes',4),
  ('Psychologues','psychologues',5),
  ('Psychiatres','psychiatres',6),
  ('Dentistes','dentistes',7),
  ('Kinés','kinesitherapeutes',8),
  ('Ostéopathes','osteopathes',9),
  ('Nutritionnistes','nutritionnistes',10),
  ('Centres de dépistage','centres-depistage',11),
  ('Coachs sportifs','coachs-sportifs',12),
  ('Massages','massages',13),
  ('Esthétique','esthetique',14)
) as s(label, slug, sort_order)
where c.slug = 'sante-bien-etre';

-- 3. Professionnels & Administratif
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Avocats','avocats',1),
  ('Notaires','notaires',2),
  ('Experts-comptables','experts-comptables',3),
  ('Banques','banques',4),
  ('Assurances','assurances',5),
  ('Courtiers','courtiers',6),
  ('Immobilier','immobilier',7),
  ('Architectes','architectes',8),
  ('Traducteurs','traducteurs',9),
  ('Photographes','photographes',10),
  ('Coachs carrière','coachs-carriere',11),
  ('CV et recrutement','cv-recrutement',12)
) as s(label, slug, sort_order)
where c.slug = 'professionnels-administratif';

-- 4. Shopping & Bonnes adresses
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Restaurants','restaurants',1),
  ('Bars','bars',2),
  ('Cafés','cafes',3),
  ('Coiffeurs','coiffeurs',4),
  ('Tatoueurs','tatoueurs',5),
  ('Boutiques','boutiques',6),
  ('Hôtels','hotels',7),
  ('Salle de sport','salle-de-sport',8),
  ('Animaleries','animaleries',9),
  ('Fleuristes','fleuristes',10),
  ('Librairies','librairies',11),
  ('Commerces LGBTQ+ ou alliés','commerces-lgbtq-allies',12)
) as s(label, slug, sort_order)
where c.slug = 'shopping-bonnes-adresses';

-- 5. Services entre particuliers
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Baby-sitting','baby-sitting',1),
  ('Pet-sitting','pet-sitting',2),
  ('Cours particuliers','cours-particuliers',3),
  ('Réparations','reparations',4),
  ('Couture','couture',5),
  ('Livraison','livraison',6),
  ('Transport','transport',7),
  ('Aide administrative','aide-administrative',8),
  ('Garde de maison','garde-de-maison',9),
  ('Cuisine','cuisine',10),
  ('Aide aux personnes âgées','aide-personnes-agees',11)
) as s(label, slug, sort_order)
where c.slug = 'services-entre-particuliers';

-- 6. Communauté & Vie LGBTQ+
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Associations','associations',1),
  ('Événements','evenements',2),
  ('Marches des Fiertés','marches-des-fiertes',3),
  ('Groupes de parole','groupes-de-parole',4),
  ('Centres LGBTQIA+','centres-lgbtqia',5),
  ('Lieux inclusifs','lieux-inclusifs',6),
  ('Recommandations de lieux « safe »','lieux-safe',7),
  ('Signalement d''expériences positives ou négatives','signalement-experiences',8),
  ('Ressources et numéros utiles','ressources-numeros-utiles',9),
  ('Guides (coming out, droits, santé…)','guides',10)
) as s(label, slug, sort_order)
where c.slug = 'communaute-vie-lgbtq';
