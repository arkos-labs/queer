-- Keep the existing taxonomy wording inclusive of all forms of housing swaps.
update public.subcategories
set label = 'Échange de logement'
where slug = 'echange-maison';
