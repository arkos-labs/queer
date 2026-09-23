import { useEffect } from 'react';

const BASE_URL = 'https://www.queerservices.fr';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface SEOConfig {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noIndex?: boolean;
}

const ROUTE_SEO: Record<string, SEOConfig> = {
  home: {
    title: "Queer Service — Annuaire d'entraide de la communauté LGBTQI+",
    description:
      "Annuaire d'entraide LGBTQI+ : trouvez et proposez des services de confiance entre membres de la communauté queer. Bricolage, ménage, garde d'animaux, tech, beauté — fait pour nous, par nous.",
    canonical: `${BASE_URL}/`,
  },
  directory: {
    title: 'Annuaire des membres — Trouvez un prestataire queer de confiance | Queer Service',
    description:
      "Parcourez l'annuaire des membres de la communauté LGBTQI+ : bricolage, ménage, garde d'animaux, tech, coiffure, beauté et plus. Services entre personnes queer, modérés et vérifiés.",
    canonical: `${BASE_URL}/annuaire`,
  },
  missions: {
    title: 'Missions & demandes de services — Queer Service',
    description:
      "Publiez ou répondez à des missions de service au sein de la communauté queer : bricolage, aide à domicile, transport, jardinage et plus.",
    canonical: `${BASE_URL}/missions`,
  },
  events: {
    title: 'Événements LGBTQI+ — Queer Service',
    description:
      "Découvrez les événements de la communauté queer : soirées, ateliers, rencontres et plus. Rejoignez un espace sécurisant et bienveillant.",
    canonical: `${BASE_URL}/evenements`,
  },
  resources: {
    title: 'Ressources pour la communauté queer — Queer Service',
    description:
      "Associations, lignes d'écoute, services de santé, droits LGBTQI+ : une sélection de ressources utiles pour la communauté queer en France.",
    canonical: `${BASE_URL}/ressources`,
  },
  legal: {
    title: 'Mentions légales — Queer Service',
    description: 'Mentions légales, CGU, politique de confidentialité et cookies de Queer Service.',
    canonical: `${BASE_URL}/mentions-legales`,
    noIndex: true,
  },
  signin: {
    title: 'Connexion — Queer Service',
    description: 'Connectez-vous à votre compte Queer Service.',
    canonical: `${BASE_URL}/connexion`,
    noIndex: true,
  },
  signup: {
    title: 'Créer un compte — Queer Service',
    description:
      "Rejoignez la communauté Queer Service gratuitement et proposez ou trouvez des services entre membres LGBTQI+ de confiance.",
    canonical: `${BASE_URL}/inscription`,
    noIndex: true,
  },
  'install-guide': {
    title: "Installer l'application — Queer Service",
    description:
      "Installez Queer Service sur votre téléphone ou ordinateur pour un accès rapide, comme une application native.",
    canonical: `${BASE_URL}/installer`,
  },
  onboarding: {
    title: 'Complétez votre profil — Queer Service',
    description: 'Finalisez la création de votre profil Queer Service.',
    canonical: `${BASE_URL}/onboarding`,
    noIndex: true,
  },
  profile: {
    title: 'Profil membre — Queer Service',
    description: "Consultez le profil d'un membre de la communauté Queer Service.",
    canonical: `${BASE_URL}/profil`,
    noIndex: true,
  },
  'my-profile': {
    title: 'Mon profil — Queer Service',
    description: 'Gérez votre profil Queer Service.',
    canonical: `${BASE_URL}/profil`,
    noIndex: true,
  },
  'profile-edit': {
    title: 'Modifier mon profil — Queer Service',
    description: 'Modifiez les informations de votre profil Queer Service.',
    canonical: `${BASE_URL}/profil/modifier`,
    noIndex: true,
  },
  settings: {
    title: 'Réglages — Queer Service',
    description: 'Gérez vos réglages de compte Queer Service.',
    canonical: `${BASE_URL}/parametres`,
    noIndex: true,
  },
  admin: {
    title: 'Administration — Queer Service',
    description: 'Espace de modération et d\'administration Queer Service.',
    canonical: `${BASE_URL}/admin`,
    noIndex: true,
  },
  messages: {
    title: 'Messages — Queer Service',
    description: 'Consultez vos conversations Queer Service.',
    canonical: `${BASE_URL}/messages`,
    noIndex: true,
  },
  'message-thread': {
    title: 'Conversation — Queer Service',
    description: 'Échangez avec un membre de la communauté Queer Service.',
    canonical: `${BASE_URL}/messages`,
    noIndex: true,
  },
  'place-detail': {
    title: 'Lieu — Queer Service',
    description: "Détails d'un lieu référencé sur Queer Service.",
    canonical: `${BASE_URL}/lieux`,
    noIndex: true,
  },
};

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function applyMeta(config: SEOConfig) {
  document.title = config.title;
  setMeta('description', config.description);
  setMeta('robots', config.noIndex ? 'noindex, follow' : 'index, follow');
  setCanonical(config.canonical);

  // Open Graph
  setMeta('og:title', config.title, 'property');
  setMeta('og:description', config.description, 'property');
  setMeta('og:url', config.canonical, 'property');
  setMeta('og:image', config.ogImage ?? DEFAULT_IMAGE, 'property');

  // Twitter
  setMeta('twitter:title', config.title);
  setMeta('twitter:description', config.description);
  setMeta('twitter:image', config.ogImage ?? DEFAULT_IMAGE);
}

// A directory route that's rendering a category (e.g. /annuaire/bricolage)
// owns its own SEO via useDirectoryCategorySEO below — this generic hook
// must skip in that case, or the two effects would fight over document.title.
export function useSEO(routeName: string, options?: { skip?: boolean }) {
  useEffect(() => {
    if (options?.skip) return;
    applyMeta(ROUTE_SEO[routeName] ?? ROUTE_SEO.home);
  }, [routeName, options?.skip]);
}

// Below this many active listings, a category page stays noindex (but still
// followed, so link equity flows through it) — an empty-looking results
// page is exactly the kind of thin content Google penalizes rather than
// ranks. Once a category crosses this, it starts getting indexed with no
// further code change needed.
export const MIN_LISTINGS_FOR_CATEGORY_INDEX = 3;

export function useDirectoryCategorySEO(
  category: { label: string; slug: string } | null | undefined,
  listingCount: number,
  city?: { label: string; slug: string } | null,
) {
  useEffect(() => {
    if (!category) return;
    const canonical = city
      ? `${BASE_URL}/annuaire/${category.slug}/${city.slug}`
      : `${BASE_URL}/annuaire/${category.slug}`;
    const title = city
      ? `${category.label} à ${city.label} — Annuaire LGBTQI+ de confiance | Queer Service`
      : `${category.label} — Annuaire LGBTQI+ de confiance | Queer Service`;
    const description = city
      ? `Trouvez un·e prestataire ${category.label.toLowerCase()} à ${city.label} au sein de la communauté LGBTQI+. Annuaire d'entraide vérifié et modéré, par et pour les personnes queer.`
      : `Trouvez un·e prestataire ${category.label.toLowerCase()} au sein de la communauté LGBTQI+. Annuaire d'entraide vérifié et modéré, par et pour les personnes queer.`;

    applyMeta({
      title,
      description,
      canonical,
      noIndex: listingCount < MIN_LISTINGS_FOR_CATEGORY_INDEX,
    });

    const breadcrumbItems = [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Annuaire', item: `${BASE_URL}/annuaire` },
      { '@type': 'ListItem', position: 3, name: category.label, item: `${BASE_URL}/annuaire/${category.slug}` },
    ];
    if (city) {
      breadcrumbItems.push({ '@type': 'ListItem', position: 4, name: city.label, item: canonical });
    }
    setJsonLd('ld-directory-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    });

    setJsonLd('ld-directory-collection', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: 'Queer Service', url: `${BASE_URL}/` },
      about: { '@type': 'Thing', name: category.label },
    });

    // Anonymized listings aren't real named entities (see the public
    // directory view's migration) — deliberately no ItemList/Person/
    // LocalBusiness schema for individual providers here.
    return () => {
      removeJsonLd('ld-directory-breadcrumb');
      removeJsonLd('ld-directory-collection');
    };
  }, [category, listingCount, city]);
}
