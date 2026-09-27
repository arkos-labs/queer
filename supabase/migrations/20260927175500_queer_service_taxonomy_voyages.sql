/*
# Add Voyages & Hébergements category
*/

-- Shift sort_order for Communauté & Vie LGBTQ+
update public.categories
set sort_order = 7
where slug = 'communaute-vie-lgbtq';

-- Insert new category
insert into public.categories (label, slug, icon, sort_order) values
  ('Voyages & Hébergements', 'voyages-hebergements', 'Plane', 6);

-- Insert new subcategories
insert into public.subcategories (category_id, label, slug, sort_order)
select c.id, s.label, s.slug, s.sort_order from public.categories c
cross join (values
  ('Hébergement temporaire', 'hebergement-temporaire', 1),
  ('Colocation', 'colocation', 2),
  ('Échange de maison', 'echange-maison', 3),
  ('Covoiturage', 'covoiturage', 4),
  ('Guides locaux', 'guides-locaux', 5)
) as s(label, slug, sort_order)
where c.slug = 'voyages-hebergements';
