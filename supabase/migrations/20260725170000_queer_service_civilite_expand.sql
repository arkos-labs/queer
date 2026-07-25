/*
# Queer Service — expand civilité options

Adds "Mx" (internationally recognized gender-neutral title) and "Autre"
(catch-all / prefer not to specify) alongside the existing Monsieur,
Madame, Iel.
*/

alter table public.profiles drop constraint if exists profiles_civilite_check;
alter table public.profiles add constraint profiles_civilite_check check (civilite in ('Monsieur','Madame','Mx','Iel','Autre'));
