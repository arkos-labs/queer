import { useRouter } from '@/lib/router';
import { legalConfig as c } from '@/lib/legalConfig';
import { ArrowLeft, FileText, ShieldCheck, Cookie, Scale } from 'lucide-react';

export type LegalSlug = 'mentions-legales' | 'cgu' | 'confidentialite' | 'cookies';

interface Section {
  heading: string;
  body: string[];
}

const PAGES: Record<LegalSlug, { title: string; icon: typeof FileText; intro: string; sections: Section[] }> = {
  'mentions-legales': {
    title: 'Mentions légales',
    icon: FileText,
    intro: `Conformément aux dispositions de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), il est précisé aux utilisateurs du site ${c.siteName} l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi.`,
    sections: [
      {
        heading: 'Éditeur du site',
        body: [
          `Le site ${c.siteName} est édité par : ${c.legalName} (${c.legalForm}).`,
          `SIRET : ${c.siret} — RCS : ${c.rcs} — Capital social : ${c.shareCapital}.`,
          `Siège social : ${c.address}.`,
          `Directeur de la publication : ${c.publicationDirector}.`,
          `Contact : ${c.contactEmail}`,
        ],
      },
      {
        heading: 'Hébergement',
        body: [
          `Hébergement du site (front-end) : ${c.frontendHost}, ${c.frontendHostAddress}.`,
          `Hébergement des données et de l'authentification : ${c.backendHost}. ${c.backendHostDetail}`,
        ],
      },
      {
        heading: 'Propriété intellectuelle',
        body: [
          `L'ensemble des éléments constituant le site ${c.siteName} (textes, graphismes, logo, structure, base de données) est protégé par le droit d'auteur et le droit des bases de données. Toute reproduction non autorisée est susceptible de constituer une contrefaçon.`,
          `Les contenus publiés par les membres (profils, avis, descriptions) restent la propriété de leurs auteur·rice·s, qui accordent à ${c.siteName} une licence non exclusive d'affichage nécessaire au fonctionnement du service.`,
        ],
      },
      {
        heading: 'Responsabilité',
        body: [
          `${c.siteName} est un annuaire de mise en relation entre membres de la communauté. Les services proposés sont fournis directement entre membres ; ${c.siteName} n'est pas partie aux contrats conclus entre utilisateur·rice·s et ne saurait être tenu responsable de la qualité, de la sécurité ou de la légalité des services échangés.`,
          `Les recommandations, avis et badges affichés sur les profils sont des indications communautaires et ne constituent pas une certification professionnelle officielle.`,
        ],
      },
      {
        heading: 'Médiation',
        body: [`En cas de litige, et à défaut de résolution amiable : ${c.mediationEntity}.`],
      },
    ],
  },

  cgu: {
    title: 'Conditions Générales d\'Utilisation',
    icon: Scale,
    intro: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'usage du site et de l'application ${c.siteName}. En créant un compte, vous acceptez sans réserve les présentes CGU ainsi que la charte de respect de la communauté.`,
    sections: [
      {
        heading: '1. Objet',
        body: [
          `${c.siteName} est une plateforme communautaire d'entraide permettant aux membres de la communauté LGBTQI+ de proposer et de rechercher des services entre particulier·e·s et associations/structures.`,
        ],
      },
      {
        heading: '2. Inscription et compte',
        body: [
          `L'inscription est réservée aux personnes majeures ou légalement autorisées à contracter. Chaque membre est responsable de l'exactitude des informations fournies et de la confidentialité de ses identifiants.`,
          `L'acceptation de la charte de respect de la communauté est une condition d'accès à la messagerie et aux mises en relation.`,
        ],
      },
      {
        heading: '3. Charte de respect',
        body: [
          `Chaque membre s'engage à respecter chaque personne quelle que soit son identité ou son expression de genre, à ne pas utiliser de langage discriminant, haineux ou stigmatisant, à respecter les pronoms et civilités choisis, et à ne pas harceler ni démarcher de façon abusive.`,
          `Tout manquement à la charte peut entraîner un avertissement, une suspension ou une suppression du compte, à la discrétion de l'équipe de modération.`,
        ],
      },
      {
        heading: '4. Comptes associatifs',
        body: [
          `Les membres s'inscrivant en tant que structure/association certifient l'exactitude des informations fournies (zone d'intervention, tarifs indicatifs). Ces informations restent sous leur seule responsabilité.`,
          `Les avis, notes et badges affichés sont des indications communautaires et ne remplacent pas les vérifications réglementaires propres à chaque activité.`,
        ],
      },
      {
        heading: '5. Contenus publiés',
        body: [
          `Chaque membre est seul responsable des contenus qu'il publie (profil, bio, avis, messages). Sont interdits : les contenus illicites, diffamatoires, haineux, discriminants, ou portant atteinte aux droits de tiers.`,
          `${c.siteName} se réserve le droit de retirer tout contenu signalé et jugé contraire aux présentes CGU ou à la loi, sans préavis.`,
        ],
      },
      {
        heading: '6. Signalement et modération',
        body: [
          `Tout membre peut signaler un profil, un avis ou un message qu'il estime contraire aux CGU ou à la charte. Chaque signalement est examiné par l'équipe de modération, qui peut prendre les mesures appropriées (avertissement, suspension, bannissement).`,
        ],
      },
      {
        heading: '7. Résiliation',
        body: [
          `Chaque membre peut supprimer son compte à tout moment depuis la page « Paramètres & confidentialité ». La suppression entraîne l'effacement définitif des données associées, sous réserve des obligations légales de conservation.`,
          `${c.siteName} peut suspendre ou résilier un compte en cas de manquement grave ou répété aux présentes CGU.`,
        ],
      },
      {
        heading: '8. Évolution des CGU',
        body: [`Les présentes CGU peuvent être mises à jour. Les membres seront informés de toute modification substantielle. Dernière mise à jour : ${c.lastUpdated}.`],
      },
      {
        heading: '9. Droit applicable',
        body: [`Les présentes CGU sont soumises au droit français. À défaut de résolution amiable, les tribunaux français compétents seront seuls saisis.`],
      },
    ],
  },

  confidentialite: {
    title: 'Politique de confidentialité',
    icon: ShieldCheck,
    intro: `Cette politique explique quelles données ${c.siteName} collecte, pourquoi, comment elles sont protégées, et quels sont vos droits, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.`,
    sections: [
      {
        heading: '1. Responsable de traitement',
        body: [`${c.legalName}, ${c.address} — contact données personnelles : ${c.dpoEmail}.`],
      },
      {
        heading: '2. Données collectées',
        body: [
          `Données de compte : email, mot de passe (chiffré), civilité, prénom/nom affiché, pronoms.`,
          `Données de profil : type de compte, bio, ville, compétences, besoins, photo, budget indicatif, et pour les comptes association/structure : zone d'intervention, tarifs indicatifs.`,
          `Données d'usage : avis et notes laissés, mises en relation, signalements, badges obtenus.`,
          `⚠️ Catégorie particulière de données (art. 9 RGPD) : en vous inscrivant sur un annuaire communautaire LGBTQI+, votre seule présence sur la plateforme peut être assimilée à une donnée relative à l'orientation sexuelle et/ou à l'identité de genre. Cette donnée n'est traitée qu'avec votre consentement explicite, recueilli lors de l'inscription, et n'est jamais utilisée à d'autres fins que le fonctionnement de la plateforme.`,
        ],
      },
      {
        heading: '3. Finalités du traitement',
        body: [
          `Créer et gérer votre compte et votre profil public au sein de la communauté.`,
          `Permettre la recherche, la mise en relation et les échanges d'avis entre membres.`,
          `Assurer la sécurité, la modération et la lutte contre les comportements abusifs.`,
          `Respecter nos obligations légales.`,
        ],
      },
      {
        heading: '4. Base légale',
        body: [
          `Exécution du contrat (fourniture du service) pour les données de compte et de profil.`,
          `Consentement explicite (art. 9 RGPD) pour le traitement des données sensibles liées à l'orientation sexuelle et à l'identité de genre. Ce consentement peut être retiré à tout moment en supprimant votre compte.`,
          `Intérêt légitime pour la modération et la prévention des abus.`,
        ],
      },
      {
        heading: '5. Destinataires des données',
        body: [
          `Vos données de profil public (nom affiché, bio, compétences, ville, avis) sont visibles par les autres membres authentifiés de la plateforme.`,
          `Votre email et téléphone ne sont affichés qu'aux membres consultant votre fiche détaillée, si vous choisissez de les renseigner.`,
          `Aucune donnée n'est vendue à des tiers. Des sous-traitants techniques (hébergement, base de données via ${c.backendHost}) traitent les données pour notre compte, dans le respect du RGPD.`,
        ],
      },
      {
        heading: '6. Durée de conservation',
        body: [
          `Les données sont conservées tant que votre compte est actif. En cas de suppression du compte, les données sont effacées immédiatement, à l'exception de celles dont la conservation est requise par la loi (ex. obligations comptables pour les comptes professionnels).`,
        ],
      },
      {
        heading: '7. Sécurité',
        body: [
          `Les données sont hébergées au sein de l'Union Européenne, chiffrées au repos et en transit. L'accès aux données est protégé par des règles de sécurité au niveau base de données (Row Level Security) : chaque membre ne peut modifier que ses propres données ; seuls les administrateurs habilités peuvent accéder aux outils de modération.`,
        ],
      },
      {
        heading: '8. Vos droits',
        body: [
          `Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données.`,
          `Depuis la page « Paramètres & confidentialité », vous pouvez à tout moment exporter l'intégralité de vos données (droit à la portabilité) ou supprimer définitivement votre compte (droit à l'effacement).`,
          `Pour toute autre demande, contactez-nous à ${c.dpoEmail}. Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
        ],
      },
      {
        heading: '9. Mineurs',
        body: [`La plateforme n'est pas destinée aux personnes mineures. Nous ne collectons pas sciemment de données concernant des mineurs.`],
      },
      {
        heading: '10. Mise à jour',
        body: [`Cette politique peut évoluer. Dernière mise à jour : ${c.lastUpdated}.`],
      },
    ],
  },

  cookies: {
    title: 'Politique de cookies',
    icon: Cookie,
    intro: `${c.siteName} limite au strict nécessaire l'usage de cookies et technologies similaires. Cette page explique ce que nous utilisons et pourquoi.`,
    sections: [
      {
        heading: 'Cookies strictement nécessaires',
        body: [
          `Un cookie / stockage local de session est utilisé pour vous maintenir connecté·e (authentification) et retenir vos préférences d'affichage (ex. bannière d'information déjà vue). Ces éléments sont indispensables au fonctionnement du service et ne nécessitent pas de consentement préalable, conformément aux recommandations de la CNIL.`,
        ],
      },
      {
        heading: 'Pas de cookies publicitaires ni de traceurs tiers',
        body: [
          `${c.siteName} n'utilise aucun cookie publicitaire, aucun traceur de réseau social et aucun outil de mesure d'audience tiers à ce jour. Si cela évoluait, cette page serait mise à jour et un bandeau de consentement vous serait proposé avant tout dépôt de cookie non essentiel.`,
        ],
      },
      {
        heading: 'Gestion',
        body: [
          `Vous pouvez à tout moment supprimer les données de session stockées localement en vous déconnectant ou en effaçant les données de votre navigateur pour ce site.`,
        ],
      },
      {
        heading: 'Mise à jour',
        body: [`Dernière mise à jour : ${c.lastUpdated}.`],
      },
    ],
  },
};

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const { navigate } = useRouter();
  const page = PAGES[slug];

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <page.icon size={20} />
            </div>
            <h1 className="font-display text-2xl font-semibold text-neutral-900 sm:text-3xl">{page.title}</h1>
          </div>
        </div>
      </div>

      <div className="container-app max-w-3xl py-8">
        <div className="card p-6 md:p-8">
          <p className="text-sm text-neutral-600">{page.intro}</p>

          <div className="mt-6 space-y-6">
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-display text-base font-semibold text-neutral-900">{s.heading}</h2>
                <div className="mt-2 space-y-2">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-neutral-600">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
