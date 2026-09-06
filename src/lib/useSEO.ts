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

export function useSEO(routeName: string) {
  useEffect(() => {
    const config = ROUTE_SEO[routeName] ?? ROUTE_SEO.home;

    document.title = config.title;
    setMeta('description', config.description);
    setMeta('robots', config.noIndex ? 'noindex, nofollow' : 'index, follow');
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
  }, [routeName]);
}
