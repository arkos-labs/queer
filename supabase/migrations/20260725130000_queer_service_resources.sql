/*
# Queer Service — Community resources & guides

1. Purpose
Backs a "Ressources & guides communautaires" page: verified crisis/support
hotlines and short informational guides (coming out, droits, santé…),
matching the "Communauté & Vie LGBTQ+" theme's sub-categories
("Ressources et numéros utiles", "Guides"). Content is admin-managed so it
can be kept accurate over time without a code deploy.

2. New table
- `public.resources` — one row per hotline or guide. `type` distinguishes
  the two. Hotline-specific fields (`phone`, `hours`) are null for guides;
  `content` (the guide body) is null for hotlines.

3. Security (RLS)
- Unlike the rest of the app, this table is readable by EVERYONE,
  including signed-out visitors (`anon` role) — safety/support resources
  should never be gated behind a login wall.
- Writes are admin-only.

4. Notes
- Seed data below reflects hotline numbers verified via web search in
  July 2026 (SOS Homophobie, Le Refuge, LÉIA EST LÀ — successor to Ligne
  Azur since May 2026, 3114, 3018, Fil Santé Jeunes). These numbers
  change occasionally; an admin should re-verify periodically.
- Guide content is intentionally general information, not legal/medical
  advice — each guide should keep pointing readers to the relevant
  professionals/associations rather than prescribing action.
*/

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('numero_utile', 'guide')),
  slug text not null unique,
  title text not null,
  description text not null,
  content text,
  phone text,
  url text,
  hours text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources enable row level security;

drop policy if exists "resources_select_public" on public.resources;
create policy "resources_select_public"
  on public.resources for select
  to anon, authenticated using (true);

drop policy if exists "resources_write_admin" on public.resources;
create policy "resources_write_admin"
  on public.resources for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists resources_type_idx on public.resources (type, sort_order);

insert into public.resources (type, slug, title, description, phone, url, hours, sort_order) values
  ('numero_utile', 'leia-est-la', 'LÉIA EST LÀ', 'Écoute et information anonymes et confidentielles sur l''orientation sexuelle et l''identité de genre, pour vous, vos proches ou les professionnel·le·s.', '0800 004 134', 'https://www.ligneazur.org/', '7j/7, 8h–23h · appel gratuit', 1),
  ('numero_utile', 'sos-homophobie', 'SOS Homophobie — ligne d''écoute', 'Soutien anonyme pour les victimes ou témoins de LGBTIphobies (lesbophobie, gayphobie, biphobie, transphobie). Tchat également disponible.', '01 48 06 42 41', 'https://www.sos-homophobie.org/ligne-ecoute', 'Lun–jeu 18h–22h · ven 18h–20h · sam 14h–16h · dim 18h–20h (fermé jours fériés)', 2),
  ('numero_utile', 'le-refuge', 'Le Refuge', 'Accueil et hébergement d''urgence pour les jeunes LGBT+ de 14 à 25 ans en rupture familiale suite à une homophobie ou transphobie. Joignable par appel ou SMS.', '09 39 03 63 03', 'https://le-refuge.org/', '7j/7', 3),
  ('numero_utile', '3114-prevention-suicide', '3114 — Prévention du suicide', 'Numéro national de prévention du suicide. Des professionnel·le·s de santé formé·e·s vous écoutent, évaluent votre situation et vous orientent — pour vous ou pour un proche.', '3114', 'https://3114.fr/', '24h/24, 7j/7 · gratuit', 4),
  ('numero_utile', '3018-violences-numeriques', '3018 — Violences numériques', 'Numéro national contre le harcèlement et le cyberharcèlement (dont LGBTIphobe). Anonyme, par téléphone, tchat ou application.', '3018', 'https://www.3018.fr/', '7j/7, 9h–23h · gratuit', 5),
  ('numero_utile', 'fil-sante-jeunes', 'Fil Santé Jeunes', 'Écoute et information sur la santé physique, mentale et sociale pour les 12–25 ans.', '0800 235 236', 'https://www.filsantejeunes.com/', '7j/7, 9h–23h · gratuit et anonyme', 6)
on conflict (slug) do nothing;

insert into public.resources (type, slug, title, description, content, sort_order) values
  (
    'guide',
    'penser-son-coming-out',
    'Penser son coming out',
    'Quelques repères pour aborder le sujet avec ses proches, à son rythme.',
    'Il n''existe pas de "bonne façon" de faire un coming out : c''est une démarche personnelle, et vous êtes seul·e légitime à choisir le moment, la forme et les personnes à qui en parler.

Quelques repères qui aident beaucoup de personnes : en parler d''abord à une personne de confiance avant un cercle plus large, préparer ce que vous voulez dire sans vous sentir obligé·e de tout expliquer ou justifier, et avoir un plan B (un lieu où aller, une personne à appeler) si la réaction est difficile.

Vous n''êtes pas obligé·e de faire ce chemin seul·e : les associations LGBTQI+ locales et les lignes d''écoute de cette page proposent un accompagnement gratuit et confidentiel, avant, pendant ou après votre coming out.',
    1
  ),
  (
    'guide',
    'connaitre-ses-droits',
    'Connaître ses droits face aux discriminations',
    'Ce que dit la loi française et vers qui se tourner en cas de discrimination.',
    'En France, les discriminations fondées sur l''orientation sexuelle ou l''identité de genre sont interdites par la loi, que ce soit dans l''emploi, le logement, l''accès à un service ou l''espace public. Les propos ou actes LGBTIphobes peuvent également constituer une infraction pénale.

Si vous êtes victime ou témoin d''une discrimination ou d''une agression : vous pouvez saisir le Défenseur des droits (gratuit, indépendant), déposer plainte ou main courante auprès de la police ou de la gendarmerie, et vous faire accompagner par une association spécialisée (SOS Homophobie, entre autres) qui peut vous aider à comprendre vos options.

Cette page ne remplace pas un avis juridique personnalisé : pour une situation précise, un·e avocat·e ou une association spécialisée pourra vous conseiller au mieux.',
    2
  ),
  (
    'guide',
    'trouver-des-soins-inclusifs',
    'Trouver des soins inclusifs',
    'Repères pour accéder à des professionnel·le·s de santé formé·e·s aux enjeux LGBTQI+.',
    'Toutes les professions de santé n''ont pas la même familiarité avec les enjeux spécifiques aux personnes LGBTQI+ (santé sexuelle, parcours de transition, santé mentale liée au minority stress...). Plusieurs centres de santé communautaires et associations tiennent des annuaires de professionnel·le·s repéré·e·s comme inclusif·ve·s.

Sur l''annuaire de Queer Service, vous pouvez repérer les praticien·ne·s recommandé·e·s par la communauté grâce aux avis et badges affichés sur chaque profil — ils restent des indications communautaires, pas une certification officielle.

En cas de doute ou de besoin urgent, les centres de santé sexuelle (CeGIDD) et les centres LGBTQI+ de votre région restent un point d''entrée fiable et gratuit.',
    3
  ),
  (
    'guide',
    'faire-face-a-une-rupture-familiale',
    'Faire face à une rupture familiale',
    'Des solutions concrètes existent en cas de rejet ou de mise à la porte.',
    'Si vous vivez une rupture familiale liée à votre orientation sexuelle ou votre identité de genre, sachez que des dispositifs d''urgence existent, en particulier si vous avez entre 14 et 25 ans : Le Refuge propose un accueil et un hébergement d''urgence partout en France (joignable par téléphone ou SMS, voir la section "Numéros utiles" ci-dessus).

Dans l''urgence immédiate (mise à la rue, danger), le 115 (SAMU social) reste également un recours pour un hébergement d''urgence, quel que soit votre âge.

Vous n''avez pas à traverser cette période seul·e : les lignes d''écoute de cette page sont là pour vous orienter, sans jugement et dans la confidentialité.',
    4
  )
on conflict (slug) do nothing;
