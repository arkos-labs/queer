alter table public.profiles drop constraint if exists profiles_civilite_check;

update public.profiles set civilite = 'Il' where civilite = 'Monsieur';
update public.profiles set civilite = 'Elle' where civilite = 'Madame';
update public.profiles set civilite = 'Iel' where civilite = 'Mx';
update public.profiles set civilite = 'Ne se prononce pas' where civilite = 'Autre';
update public.profiles set civilite = 'Ne se prononce pas' where civilite = 'Je ne me prononce pas';
alter table public.profiles add constraint profiles_civilite_check check (civilite in ('Il', 'Elle', 'Iel', 'Ielle', 'Ne se prononce pas'));
