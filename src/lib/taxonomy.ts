import type { Category, Subcategory } from '@/lib/types';

/*
 * Local fallback taxonomy — mirrors exactly the data seeded by
 * supabase/migrations/20260725090000_queer_service_taxonomy_v2.sql.
 *
 * Categories/subcategories are static reference data (not user data), so
 * it's safe to ship a copy client-side and fall back to it whenever the
 * Supabase request fails (no project connected yet, offline, etc.). This
 * keeps the directory's category tabs and the "services proposés" picker
 * usable during local development/demo, before a real Supabase project is
 * wired up. Real member/profile data is never faked this way.
 */

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-maison-depannage', label: 'Maison & Dépannage', slug: 'maison-depannage', icon: 'Home', sort_order: 1 },
  { id: 'cat-sante-bien-etre', label: 'Santé & Bien-être', slug: 'sante-bien-etre', icon: 'HeartPulse', sort_order: 2 },
  { id: 'cat-professionnels-administratif', label: 'Professionnels & Administratif', slug: 'professionnels-administratif', icon: 'Briefcase', sort_order: 3 },
  { id: 'cat-shopping-bonnes-adresses', label: 'Shopping & Bonnes adresses', slug: 'shopping-bonnes-adresses', icon: 'ShoppingBag', sort_order: 4 },
  { id: 'cat-services-entre-particuliers', label: 'Services entre particuliers', slug: 'services-entre-particuliers', icon: 'Handshake', sort_order: 5 },
  { id: 'cat-communaute-vie-lgbtq', label: 'Communauté & Vie LGBTQ+', slug: 'communaute-vie-lgbtq', icon: 'Users', sort_order: 6 },
];

function subs(categoryId: string, entries: [string, string, number][]): Subcategory[] {
  return entries.map(([label, slug, sort_order]) => ({
    id: `${categoryId}__${slug}`,
    category_id: categoryId,
    label,
    slug,
    sort_order,
  }));
}

export const FALLBACK_SUBCATEGORIES: Subcategory[] = [
  ...subs('cat-maison-depannage', [
    ['Montage de meubles', 'montage-meubles', 1],
    ['Bricolage', 'bricolage', 2],
    ['Plomberie', 'plomberie', 3],
    ['Électricité', 'electricite', 4],
    ['Serrurerie', 'serrurerie', 5],
    ['Peinture', 'peinture', 6],
    ['Jardinage', 'jardinage', 7],
    ['Ménage', 'menage', 8],
    ['Déménagement', 'demenagement', 9],
    ['Nettoyage', 'nettoyage', 10],
    ['Informatique à domicile', 'informatique-domicile', 11],
  ]),
  ...subs('cat-sante-bien-etre', [
    ['Médecins généralistes', 'medecins-generalistes', 1],
    ['Gynécologues', 'gynecologues', 2],
    ['Urologues', 'urologues', 3],
    ['Sages-femmes', 'sages-femmes', 4],
    ['Psychologues', 'psychologues', 5],
    ['Psychiatres', 'psychiatres', 6],
    ['Dentistes', 'dentistes', 7],
    ['Kinés', 'kinesitherapeutes', 8],
    ['Ostéopathes', 'osteopathes', 9],
    ['Nutritionnistes', 'nutritionnistes', 10],
    ['Centres de dépistage', 'centres-depistage', 11],
    ['Coachs sportifs', 'coachs-sportifs', 12],
    ['Salle de sport', 'salle-de-sport', 13],
    ['Massages', 'massages', 14],
    ['Esthétique', 'esthetique', 15],
    ['Coiffeurs', 'coiffeurs', 16],
    ['Tatoueurs', 'tatoueurs', 17],
  ]),
  ...subs('cat-professionnels-administratif', [
    ['Avocats', 'avocats', 1],
    ['Notaires', 'notaires', 2],
    ['Experts-comptables', 'experts-comptables', 3],
    ['Banques', 'banques', 4],
    ['Assurances', 'assurances', 5],
    ['Courtiers', 'courtiers', 6],
    ['Immobilier', 'immobilier', 7],
    ['Architectes', 'architectes', 8],
    ['Traducteurs', 'traducteurs', 9],
    ['Photographes', 'photographes', 10],
    ['Coachs carrière', 'coachs-carriere', 11],
    ['CV et recrutement', 'cv-recrutement', 12],
  ]),
  ...subs('cat-shopping-bonnes-adresses', [
    ['Restaurants', 'restaurants', 1],
    ['Bars', 'bars', 2],
    ['Cafés', 'cafes', 3],
    ['Boutiques', 'boutiques', 4],
    ['Hôtels', 'hotels', 5],
    ['Animaleries', 'animaleries', 6],
    ['Fleuristes', 'fleuristes', 7],
    ['Librairies', 'librairies', 8],
    ['Commerces LGBTQ+ ou alliés', 'commerces-lgbtq-allies', 9],
  ]),
  ...subs('cat-services-entre-particuliers', [
    ['Baby-sitting', 'baby-sitting', 1],
    ['Pet-sitting', 'pet-sitting', 2],
    ['Cours particuliers', 'cours-particuliers', 3],
    ['Réparations', 'reparations', 4],
    ['Couture', 'couture', 5],
    ['Livraison', 'livraison', 6],
    ['Transport', 'transport', 7],
    ['Aide administrative', 'aide-administrative', 8],
    ['Garde de maison', 'garde-de-maison', 9],
    ['Cuisine', 'cuisine', 10],
    ['Aide aux personnes âgées', 'aide-personnes-agees', 11],
  ]),
  ...subs('cat-communaute-vie-lgbtq', [
    ['Associations', 'associations', 1],
    ['Marches des Fiertés', 'marches-des-fiertes', 3],
    ['Groupes de parole', 'groupes-de-parole', 4],
    ['Centres LGBTQIA+', 'centres-lgbtqia', 5],
    ['Lieux inclusifs', 'lieux-inclusifs', 6],
    ['Recommandations de lieux « safe »', 'lieux-safe', 7],
    ["Signalement d'expériences positives ou négatives", 'signalement-experiences', 8],
    ['Ressources et numéros utiles', 'ressources-numeros-utiles', 9],
    ['Guides (coming out, droits, santé…)', 'guides', 10],
  ]),
];
