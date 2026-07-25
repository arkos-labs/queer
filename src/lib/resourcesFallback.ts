import type { Resource } from '@/lib/types';

/*
 * Local fallback copy of supabase/migrations/20260725130000_queer_service_resources.sql.
 * Same reasoning as taxonomy.ts: these are static, admin-curated reference
 * items (not user data), so it's safe to ship a copy and fall back to it
 * whenever Supabase isn't reachable yet — support/crisis resources should
 * never simply disappear because a backend request failed.
 *
 * Hotline numbers verified via web search in July 2026. If you update the
 * seed migration, keep this file in sync (or, once a real Supabase project
 * is live, this fallback only ever matters as an offline safety net).
 */

export const FALLBACK_RESOURCES: Resource[] = [
  {
    id: 'fallback-leia-est-la',
    type: 'numero_utile',
    slug: 'leia-est-la',
    title: 'LÉIA EST LÀ',
    description:
      "Écoute et information anonymes et confidentielles sur l'orientation sexuelle et l'identité de genre, pour vous, vos proches ou les professionnel·le·s.",
    content: null,
    phone: '0800 004 134',
    url: 'https://www.ligneazur.org/',
    hours: '7j/7, 8h–23h · appel gratuit',
    sort_order: 1,
  },
  {
    id: 'fallback-sos-homophobie',
    type: 'numero_utile',
    slug: 'sos-homophobie',
    title: "SOS Homophobie — ligne d'écoute",
    description:
      'Soutien anonyme pour les victimes ou témoins de LGBTIphobies (lesbophobie, gayphobie, biphobie, transphobie). Tchat également disponible.',
    content: null,
    phone: '01 48 06 42 41',
    url: 'https://www.sos-homophobie.org/ligne-ecoute',
    hours: 'Lun–jeu 18h–22h · ven 18h–20h · sam 14h–16h · dim 18h–20h (fermé jours fériés)',
    sort_order: 2,
  },
  {
    id: 'fallback-le-refuge',
    type: 'numero_utile',
    slug: 'le-refuge',
    title: 'Le Refuge',
    description:
      "Accueil et hébergement d'urgence pour les jeunes LGBT+ de 14 à 25 ans en rupture familiale suite à une homophobie ou transphobie. Joignable par appel ou SMS.",
    content: null,
    phone: '09 39 03 63 03',
    url: 'https://le-refuge.org/',
    hours: '7j/7',
    sort_order: 3,
  },
  {
    id: 'fallback-3114',
    type: 'numero_utile',
    slug: '3114-prevention-suicide',
    title: '3114 — Prévention du suicide',
    description:
      "Numéro national de prévention du suicide. Des professionnel·le·s de santé formé·e·s vous écoutent, évaluent votre situation et vous orientent — pour vous ou pour un proche.",
    content: null,
    phone: '3114',
    url: 'https://3114.fr/',
    hours: '24h/24, 7j/7 · gratuit',
    sort_order: 4,
  },
  {
    id: 'fallback-3018',
    type: 'numero_utile',
    slug: '3018-violences-numeriques',
    title: '3018 — Violences numériques',
    description:
      'Numéro national contre le harcèlement et le cyberharcèlement (dont LGBTIphobe). Anonyme, par téléphone, tchat ou application.',
    content: null,
    phone: '3018',
    url: 'https://www.3018.fr/',
    hours: '7j/7, 9h–23h · gratuit',
    sort_order: 5,
  },
  {
    id: 'fallback-fil-sante-jeunes',
    type: 'numero_utile',
    slug: 'fil-sante-jeunes',
    title: 'Fil Santé Jeunes',
    description: 'Écoute et information sur la santé physique, mentale et sociale pour les 12–25 ans.',
    content: null,
    phone: '0800 235 236',
    url: 'https://www.filsantejeunes.com/',
    hours: '7j/7, 9h–23h · gratuit et anonyme',
    sort_order: 6,
  },
  {
    id: 'fallback-guide-coming-out',
    type: 'guide',
    slug: 'penser-son-coming-out',
    title: 'Penser son coming out',
    description: "Quelques repères pour aborder le sujet avec ses proches, à son rythme.",
    content: `Il n'existe pas de "bonne façon" de faire un coming out : c'est une démarche personnelle, et vous êtes seul·e légitime à choisir le moment, la forme et les personnes à qui en parler.

Quelques repères qui aident beaucoup de personnes : en parler d'abord à une personne de confiance avant un cercle plus large, préparer ce que vous voulez dire sans vous sentir obligé·e de tout expliquer ou justifier, et avoir un plan B (un lieu où aller, une personne à appeler) si la réaction est difficile.

Vous n'êtes pas obligé·e de faire ce chemin seul·e : les associations LGBTQI+ locales et les lignes d'écoute de cette page proposent un accompagnement gratuit et confidentiel, avant, pendant ou après votre coming out.`,
    phone: null,
    url: null,
    hours: null,
    sort_order: 1,
  },
  {
    id: 'fallback-guide-droits',
    type: 'guide',
    slug: 'connaitre-ses-droits',
    title: 'Connaître ses droits face aux discriminations',
    description: 'Ce que dit la loi française et vers qui se tourner en cas de discrimination.',
    content: `En France, les discriminations fondées sur l'orientation sexuelle ou l'identité de genre sont interdites par la loi, que ce soit dans l'emploi, le logement, l'accès à un service ou l'espace public. Les propos ou actes LGBTIphobes peuvent également constituer une infraction pénale.

Si vous êtes victime ou témoin d'une discrimination ou d'une agression : vous pouvez saisir le Défenseur des droits (gratuit, indépendant), déposer plainte ou main courante auprès de la police ou de la gendarmerie, et vous faire accompagner par une association spécialisée (SOS Homophobie, entre autres) qui peut vous aider à comprendre vos options.

Cette page ne remplace pas un avis juridique personnalisé : pour une situation précise, un·e avocat·e ou une association spécialisée pourra vous conseiller au mieux.`,
    phone: null,
    url: null,
    hours: null,
    sort_order: 2,
  },
  {
    id: 'fallback-guide-soins',
    type: 'guide',
    slug: 'trouver-des-soins-inclusifs',
    title: 'Trouver des soins inclusifs',
    description: "Repères pour accéder à des professionnel·le·s de santé formé·e·s aux enjeux LGBTQI+.",
    content: `Toutes les professions de santé n'ont pas la même familiarité avec les enjeux spécifiques aux personnes LGBTQI+ (santé sexuelle, parcours de transition, santé mentale liée au minority stress...). Plusieurs centres de santé communautaires et associations tiennent des annuaires de professionnel·le·s repéré·e·s comme inclusif·ve·s.

Sur l'annuaire de Queer Service, vous pouvez repérer les praticien·ne·s recommandé·e·s par la communauté grâce aux avis et badges affichés sur chaque profil — ils restent des indications communautaires, pas une certification officielle.

En cas de doute ou de besoin urgent, les centres de santé sexuelle (CeGIDD) et les centres LGBTQI+ de votre région restent un point d'entrée fiable et gratuit.`,
    phone: null,
    url: null,
    hours: null,
    sort_order: 3,
  },
  {
    id: 'fallback-guide-rupture',
    type: 'guide',
    slug: 'faire-face-a-une-rupture-familiale',
    title: 'Faire face à une rupture familiale',
    description: "Des solutions concrètes existent en cas de rejet ou de mise à la porte.",
    content: `Si vous vivez une rupture familiale liée à votre orientation sexuelle ou votre identité de genre, sachez que des dispositifs d'urgence existent, en particulier si vous avez entre 14 et 25 ans : Le Refuge propose un accueil et un hébergement d'urgence partout en France (joignable par téléphone ou SMS, voir la section "Numéros utiles" ci-dessus).

Dans l'urgence immédiate (mise à la rue, danger), le 115 (SAMU social) reste également un recours pour un hébergement d'urgence, quel que soit votre âge.

Vous n'avez pas à traverser cette période seul·e : les lignes d'écoute de cette page sont là pour vous orienter, sans jugement et dans la confidentialité.`,
    phone: null,
    url: null,
    hours: null,
    sort_order: 4,
  },
];
