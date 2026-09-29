import { useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { legalConfig as c } from '@/lib/legalConfig';
import { ArrowLeft, FileText, ShieldCheck, Cookie, Scale, Download } from 'lucide-react';

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
          `Les présentes Conditions Générales d'Utilisation (« CGU ») ont pour objet de définir les conditions d'accès et d'utilisation de Queer Services, plateforme numérique communautaire de mise en relation et d'entraide.`,
          `Queer Services permet à toute personne de rechercher, proposer, échanger ou réserver des services auprès d'autres utilisateurs particuliers ou de professionnels.`,
          `La plateforme a été conçue avec une attention particulière aux besoins et aux réalités des personnes LGBTQIA+, tout en étant ouverte à toute personne souhaitant utiliser le service dans le respect des présentes CGU.`,
          `Queer Services a notamment pour ambition de favoriser l'entraide, la circulation des compétences, l'autonomie et la création de liens au sein de la communauté.`,
        ],
      },
      {
        heading: '2. Présentation de Queer Services',
        body: [
          `Queer Services permet notamment à un utilisateur :`,
          `• de créer un profil ;`,
          `• d'indiquer les compétences ou services qu'il souhaite proposer ;`,
          `• de rechercher un service ou une compétence ;`,
          `• de recevoir des suggestions de profils correspondant à son besoin ;`,
          `• d'entrer en contact avec d'autres utilisateurs ;`,
          `• de proposer ou demander un échange de services ;`,
          `• de réserver certaines prestations ;`,
          `• de payer certaines prestations directement depuis la plateforme ;`,
          `• de prendre rendez-vous avec certains professionnels ;`,
          `• de laisser ou consulter des évaluations lorsque cette fonctionnalité est disponible.`,
          `Les services peuvent notamment concerner le pet sitting, le bricolage, l'informatique, la coiffure, la cuisine, les cours, la photographie, l'aide administrative, l'accompagnement du quotidien ou tout autre service autorisé sur la plateforme.`,
          `Des professionnels, notamment des professionnels de santé, peuvent également être référencés sur Queer Services.`,
          `La liste des services disponibles est susceptible d'évoluer.`,
        ],
      },
      {
        heading: '3. Accès à la plateforme',
        body: [
          `L'inscription à Queer Services est ouverte à toute personne remplissant les conditions d'utilisation de la plateforme.`,
          `L'appartenance réelle ou supposée à la communauté LGBTQIA+ n'est pas une condition d'inscription. Queer Services a vocation à être un espace particulièrement attentif aux besoins des personnes LGBTQIA+ et à lutter contre les comportements LGBTQIAphobes, discriminatoires ou harcelants, sans pour autant réserver l'accès de la plateforme aux seules personnes LGBTQIA+.`,
          `L'utilisateur doit être âgé d'au moins 18 ans, sauf si une fonctionnalité spécifique prévoit légalement des conditions différentes.`,
          `L'utilisateur garantit que les informations fournies lors de son inscription sont exactes, sincères et à jour.`,
        ],
      },
      {
        heading: '4. Création du compte',
        body: [
          `Certaines fonctionnalités nécessitent la création d'un compte personnel. L'utilisateur est responsable de la confidentialité de ses identifiants. Il s'engage notamment à :`,
          `• ne pas communiquer ses identifiants à un tiers ;`,
          `• ne pas utiliser le compte d'une autre personne ;`,
          `• signaler immédiatement toute utilisation non autorisée de son compte ;`,
          `• maintenir ses informations à jour.`,
          `Queer Services peut mettre en œuvre des mécanismes de vérification destinés à renforcer la sécurité de la plateforme. Lorsque cela est nécessaire, certains profils peuvent faire l'objet d'une vérification d'identité, de statut professionnel ou d'autres justificatifs.`,
          `La présence d'un badge ou d'une mention « vérifié » ne constitue toutefois pas une garantie absolue de la qualité ou de la sécurité d'une prestation.`,
        ],
      },
      {
        heading: '5. Fonctionnement de la mise en relation',
        body: [
          `L'utilisateur peut :`,
          `PROPOSER — Indiquer les compétences, services ou prestations qu'il souhaite proposer.`,
          `RECHERCHER — Décrire le service ou la compétence dont il a besoin.`,
          `MATCHER — Recevoir des suggestions de profils susceptibles de correspondre à sa recherche.`,
          `ÉCHANGER — Contacter un autre utilisateur ou un professionnel par l'intermédiaire des fonctionnalités disponibles.`,
          `PARTAGER — Réaliser un échange gratuit, réciproque ou rémunéré selon les modalités proposées.`,
          `Les suggestions de profils peuvent être générées automatiquement à partir de critères renseignés par les utilisateurs. Les mécanismes de recommandation ne constituent pas une garantie que le profil proposé correspondra parfaitement au besoin exprimé.`,
        ],
      },
      {
        heading: '6. Les différents modes d\'échange',
        body: [
          `Queer Services peut permettre trois formes principales d'échange.`,
          `6.1. Échange gratuit : Un utilisateur peut proposer un service gratuitement à un autre utilisateur.`,
          `6.2. Échange réciproque : Deux utilisateurs peuvent convenir d'un échange de services. Par exemple : une personne propose deux heures de bricolage ; une autre propose en contrepartie deux heures de cours de langue. Les utilisateurs déterminent librement les modalités de leur échange.`,
          `6.3. Échange rémunéré : Un utilisateur ou un professionnel peut proposer une prestation contre rémunération. Lorsque le paiement est effectué par l'intermédiaire de Queer Services, les modalités tarifaires sont présentées avant la validation de la transaction. Le prestataire demeure responsable de la prestation proposée et du respect des obligations légales applicables à son activité.`,
        ],
      },
      {
        heading: '7. Paiement et commission de Queer Services',
        body: [
          `Lorsque le paiement d'une prestation est effectué directement sur Queer Services, celui-ci peut être réalisé par l'intermédiaire d'un prestataire de paiement partenaire.`,
          `Queer Services prélève une commission de 5 % sur le montant de la transaction, sauf indication contraire affichée avant la validation du paiement.`,
          `Le montant total facturé à l'utilisateur ainsi que, lorsque cela est pertinent, le montant revenant au prestataire sont présentés avant la confirmation de la transaction.`,
          `Les frais éventuellement applicables sont indiqués de manière transparente avant le paiement.`,
          `Les coordonnées bancaires peuvent être traitées directement par le prestataire de paiement. Queer Services ne demande jamais à un utilisateur de communiquer son numéro complet de carte bancaire dans la messagerie.`,
        ],
      },
      {
        heading: '8. Réservation et prise de rendez-vous',
        body: [
          `Certaines prestations peuvent être réservées directement depuis l'Application. L'utilisateur peut notamment sélectionner : un professionnel ; un service ; une date ; un créneau horaire ; et, lorsque cela est applicable, un lieu.`,
          `La réservation devient effective selon les modalités indiquées lors de la confirmation.`,
          `Les conditions d'annulation, de modification et de remboursement sont présentées avant la validation de la réservation lorsqu'elles sont applicables.`,
          `Lorsqu'une prestation est fournie par un professionnel, celui-ci demeure responsable de son exécution.`,
        ],
      },
      {
        heading: '9. Professionnels',
        body: [
          `Les professionnels proposant leurs services sur Queer Services sont responsables :`,
          `• de l'exactitude des informations figurant sur leur profil ;`,
          `• de leurs qualifications ;`,
          `• de leurs autorisations professionnelles ;`,
          `• de leur assurance lorsqu'elle est obligatoire ;`,
          `• de leurs obligations fiscales et sociales ;`,
          `• du respect de la réglementation applicable à leur profession ;`,
          `• de la qualité et de la conformité des prestations fournies.`,
          `Queer Services peut mettre en place des procédures de vérification des professionnels. Lorsqu'un professionnel est identifié comme « vérifié », cette vérification porte uniquement sur les éléments expressément indiqués par Queer Services. Elle ne signifie pas que Queer Services garantit la qualité de ses prestations.`,
        ],
      },
      {
        heading: '10. Professionnels de santé',
        body: [
          `Queer Services peut permettre à certains professionnels de santé de présenter leur activité, de proposer des créneaux de rendez-vous et, lorsque la fonctionnalité est disponible, de recevoir le paiement d'une consultation ou d'une prestation.`,
          `Les professionnels de santé demeurent entièrement responsables de l'exercice de leur profession. Queer Services : ne réalise aucun acte médical ; ne pose aucun diagnostic ; ne délivre aucun conseil médical ; ne prescrit aucun traitement ; ne se substitue pas au professionnel de santé. La prise de rendez-vous via Queer Services ne constitue pas une consultation médicale.`,
          `Urgence médicale : Queer Services n'est pas un service d'urgence. En cas d'urgence médicale, l'utilisateur doit contacter immédiatement les services d'urgence compétents.`,
          `Données médicales : L'utilisateur ne doit pas utiliser la messagerie générale de Queer Services pour transmettre des informations médicales qui ne sont pas nécessaires à la prise de rendez-vous.`,
          `Lorsque des données de santé sont traitées dans le cadre d'une fonctionnalité médicale, elles font l'objet de mesures de protection spécifiques et sont traitées conformément à la réglementation applicable. Les données de santé bénéficient d'une protection renforcée au titre du RGPD. Lorsque l'architecture technique implique l'hébergement par un tiers de données de santé recueillies dans le cadre d'activités de prévention, de diagnostic, de soins ou de suivi médico-social, les règles applicables à l'hébergement des données de santé doivent notamment être prises en compte.`,
        ],
      },
      {
        heading: '11. Messagerie',
        body: [
          `Queer Services met à disposition une messagerie destinée à faciliter les échanges entre utilisateurs et, lorsque cela est prévu, entre utilisateurs et professionnels. La messagerie doit être utilisée dans le respect des autres utilisateurs.`,
          `Sont notamment interdits : les menaces ; le harcèlement ; les insultes ; les propos haineux ; les comportements LGBTQIAphobes ; les propos racistes ou discriminatoires ; les contenus sexuels non sollicités ; les tentatives d'escroquerie ; l'usurpation d'identité ; la diffusion non autorisée de données personnelles ; les sollicitations frauduleuses ; les tentatives de contournement du système de paiement ; tout contenu ou comportement contraire à la loi.`,
          `Queer Services peut mettre en place des dispositifs de détection, de signalement et de modération afin de préserver la sécurité de ses utilisateurs. Les données de messagerie peuvent être conservées pendant une durée proportionnée aux finalités de sécurité, de prévention des abus, de gestion des litiges et de respect des obligations légales. Les modalités précises sont définies dans la Politique de confidentialité.`,
        ],
      },
      {
        heading: '12. Règles de la communauté',
        body: [
          `Queer Services souhaite favoriser un environnement fondé sur la solidarité, la confiance et le respect. Tout utilisateur doit adopter un comportement respectueux.`,
          `Sont notamment interdits les comportements visant à : intimider une personne ; l'exclure ou l'humilier en raison de son identité ou de son expression de genre ; la harceler en raison de son orientation sexuelle ; tenir des propos transphobes, homophobes, lesbophobes, biphobes ou plus généralement LGBTQIAphobes ; publier des informations permettant d'identifier ou de localiser une personne sans son accord ; exercer une pression ou une menace sur un autre utilisateur.`,
          `Ces règles s'appliquent à tous les utilisateurs, qu'ils soient LGBTQIA+ ou non.`,
        ],
      },
      {
        heading: '13. Avis et évaluations',
        body: [
          `Lorsque la fonctionnalité est disponible, les utilisateurs peuvent publier une évaluation à la suite d'une prestation ou d'un échange. Les avis doivent être sincères et correspondre à une expérience réelle.`,
          `Il est notamment interdit : de publier un faux avis ; de publier un avis contre rémunération lorsque cela n'est pas clairement autorisé ; de publier plusieurs avis artificiels ; de menacer une personne pour obtenir ou supprimer un avis ; de publier des données personnelles d'un tiers ; de publier des propos discriminatoires ou injurieux.`,
          `Queer Services peut retirer un avis qui ne respecte pas les présentes CGU ou la réglementation applicable.`,
        ],
      },
      {
        heading: '14. Localisation',
        body: [
          `Queer Services peut utiliser la localisation de l'utilisateur afin de faciliter la recherche de services à proximité.`,
          `La localisation peut être présentée sous une forme approximative afin d'éviter de révéler inutilement l'adresse exacte d'un utilisateur. Sauf nécessité particulière et consentement approprié, l'adresse personnelle exacte d'un utilisateur ne doit pas être publiquement affichée sur son profil.`,
          `Les modalités de collecte et d'utilisation des données de localisation sont détaillées dans la Politique de confidentialité.`,
        ],
      },
      {
        heading: '15. Contenus publiés',
        body: [
          `Les utilisateurs peuvent publier des photographies, descriptions, annonces, informations relatives à leurs compétences, évaluations et autres contenus autorisés.`,
          `L'utilisateur garantit disposer des droits nécessaires pour publier ces contenus. Il reste responsable des contenus qu'il publie.`,
          `L'utilisateur autorise Queer Services à héberger, reproduire et représenter ces contenus uniquement dans la mesure nécessaire au fonctionnement de la plateforme.`,
        ],
      },
      {
        heading: '16. Signalement et modération',
        body: [
          `Un mécanisme de signalement permet aux utilisateurs de signaler un profil, un contenu, une conversation ou un comportement problématique.`,
          `Les signalements peuvent notamment concerner : une fraude ; une menace ; un comportement dangereux ; une discrimination ; du harcèlement ; un contenu illégal ; une usurpation d'identité ; une violation des présentes CGU.`,
          `Queer Services peut prendre les mesures nécessaires, notamment : supprimer un contenu ; limiter certaines fonctionnalités ; avertir un utilisateur ; suspendre temporairement un compte ; résilier définitivement un compte ; empêcher la création d'un nouveau compte ; transmettre certaines informations aux autorités compétentes lorsque la loi l'impose ou l'autorise.`,
        ],
      },
      {
        heading: '17. Responsabilité des utilisateurs',
        body: [
          `Chaque utilisateur est responsable des services qu'il propose et des engagements qu'il prend auprès d'un autre utilisateur.`,
          `Queer Services n'est pas responsable : de la qualité d'une prestation fournie par un utilisateur ; de la disponibilité d'un prestataire ; du comportement d'un utilisateur ; de l'exactitude des informations publiées par un utilisateur ; des dommages résultant directement d'une prestation réalisée par un utilisateur ; d'un échange privé conclu en dehors des fonctionnalités de la plateforme.`,
          `Cette limitation s'applique sous réserve des dispositions légales impératives.`,
        ],
      },
      {
        heading: '18. Responsabilité de Queer Services',
        body: [
          `Queer Services met en œuvre des moyens raisonnables afin d'assurer le fonctionnement et la sécurité de la plateforme. Cependant, aucune garantie de disponibilité permanente ne peut être donnée.`,
          `L'accès à la plateforme peut notamment être interrompu en raison : d'opérations de maintenance ; de mises à jour ; de difficultés techniques ; d'incidents de sécurité ; d'événements indépendants de la volonté de Queer Services.`,
          `Queer Services ne garantit pas qu'un utilisateur trouvera un prestataire ou obtiendra une réponse à sa demande.`,
        ],
      },
      {
        heading: '19. Propriété intellectuelle',
        body: [
          `L'ensemble des éléments composant Queer Services, notamment son nom, sa marque, son logo, son interface, son architecture, ses logiciels, ses bases de données, ses textes et ses éléments graphiques, sont protégés par les dispositions applicables en matière de propriété intellectuelle. Toute reproduction ou exploitation non autorisée est interdite.`,
        ],
      },
      {
        heading: '20. Données personnelles',
        body: [
          `Queer Services traite des données personnelles nécessaires à la création des comptes, au fonctionnement de la mise en relation, à la réservation, au paiement, à la messagerie, à la sécurité et à l'amélioration du service.`,
          `Certaines données susceptibles d'être renseignées volontairement par les utilisateurs peuvent constituer des données sensibles, notamment lorsqu'elles révèlent l'orientation sexuelle ou concernent la santé. La collecte de telles données doit être strictement encadrée et limitée à ce qui est nécessaire aux finalités poursuivies.`,
          `Les modalités précises des traitements sont détaillées dans la Politique de confidentialité de Queer Services.`,
        ],
      },
      {
        heading: '21. Sécurité des données',
        body: [
          `Queer Services met en œuvre des mesures techniques et organisationnelles appropriées afin de protéger les données personnelles contre les accès non autorisés, la perte, l'altération ou la divulgation. Les mesures de sécurité sont adaptées à la nature et à la sensibilité des données traitées.`,
          `Une attention particulière est accordée aux données susceptibles de révéler l'orientation sexuelle ainsi qu'aux données de santé. Lorsque des traitements présentent un risque élevé pour les droits et libertés des personnes, une analyse d'impact relative à la protection des données peut être nécessaire.`,
        ],
      },
      {
        heading: '22. Droit de rétractation et annulation',
        body: [
          `Lorsque l'utilisateur contracte avec un professionnel à distance, les dispositions du Code de la consommation relatives au droit de rétractation peuvent être applicables, sous réserve des exceptions prévues par la loi. Les conditions peuvent notamment différer selon la nature du service et la date à laquelle celui-ci doit être exécuté.`,
          `Lorsque le droit de rétractation est applicable, l'utilisateur reçoit les informations nécessaires avant la conclusion du contrat. Le droit de rétractation peut notamment être soumis à des exceptions prévues par le Code de la consommation pour certaines prestations.`,
          `Les conditions particulières d'annulation et de remboursement sont présentées avant la validation d'une réservation lorsqu'elles sont applicables.`,
        ],
      },
      {
        heading: '23. Suppression et suspension du compte',
        body: [
          `L'utilisateur peut demander la suppression de son compte selon les fonctionnalités disponibles.`,
          `Queer Services peut suspendre ou résilier un compte notamment en cas : de violation des présentes CGU ; de fraude ; de comportement dangereux ; de harcèlement ; de discrimination ; de contournement des paiements ; d'utilisation illicite de la plateforme ; d'atteinte à la sécurité du service.`,
          `Lorsque les circonstances le permettent, l'utilisateur est informé des motifs de la mesure prise.`,
        ],
      },
      {
        heading: '24. Modification des CGU',
        body: [
          `Queer Services peut modifier les présentes CGU afin de tenir compte de l'évolution : de la réglementation ; des fonctionnalités ; des modalités de paiement ; des mécanismes de sécurité ; des services proposés.`,
          `Les utilisateurs sont informés des modifications dans des conditions adaptées à leur importance. Lorsque cela est requis, une nouvelle acceptation des CGU pourra être demandée.`,
        ],
      },
      {
        heading: '25. Réclamations',
        body: [
          `Toute réclamation peut être adressée à : ${c.contactEmail}`,
          `L'utilisateur est invité à fournir toutes les informations nécessaires au traitement de sa demande.`,
          `Lorsqu'un litige relève de la médiation de la consommation, l'utilisateur consommateur pourra recourir au dispositif de médiation applicable au professionnel concerné, dans les conditions prévues par la réglementation.`,
        ],
      },
      {
        heading: '26. Droit applicable',
        body: [
          `Les présentes CGU sont soumises au droit français. Lorsqu'un utilisateur bénéficie de dispositions impératives protectrices en qualité de consommateur, celles-ci demeurent applicables. Les règles de compétence juridictionnelle applicables détermineront la juridiction compétente en cas de litige.`,
        ],
      },
      {
        heading: '27. Acceptation',
        body: [
          `La création d'un compte ou l'utilisation de Queer Services implique l'acceptation des présentes CGU. Lorsque cela est requis, l'utilisateur doit confirmer expressément son acceptation en cochant la case prévue à cet effet.`,
          `L'utilisateur reconnaît avoir eu la possibilité de consulter les présentes CGU avant d'utiliser la plateforme.`,
        ],
      },
    ],
  },

  confidentialite: {
    title: 'Politique de confidentialité',
    icon: ShieldCheck,
    intro: `Version consolidée en 15 articles — 27 septembre 2026. Fait pour nous, par nous.`,
    sections: [
      {
        heading: 'Article 1 — Objet et champ d’application',
        body: [
          `Queer Services est une plateforme communautaire de mise en relation et d’entraide, particulièrement attentive aux besoins des personnes LGBTQIA+ et ouverte à toute personne respectant ses valeurs.`,
          `La présente politique définit les conditions dans lesquelles Queer Services collecte, utilise, conserve et protège les données personnelles. Elle s’applique aux visiteurs du site, aux utilisateurs de la plateforme, aux membres, aux adhérent·es, aux bénévoles, aux dirigeant·es et aux personnes accompagnées.`,
          `Elle précise également les obligations de confidentialité, de probité et de respect qui s’imposent aux personnes participant aux activités de l’association.`
        ]
      },
      {
        heading: 'Article 2 — Responsable du traitement',
        body: [
          `Le responsable du traitement est la personne physique ou morale qui détermine les finalités et les moyens d’utilisation des données personnelles.`,
          `Le responsable envisagé est l’association Queer Services, représentée par sa présidente, Sandrine KHOTO THINU, sous réserve de son enregistrement définitif.`,
          `Pour toute question relative à la protection des données personnelles ou à l’exercice de vos droits :`,
          `• Courriel : contact@queerservices.fr`,
          `• Site internet : https://www.queerservices.fr/`,
          `Si la plateforme est exploitée par une autre personne physique ou morale avant l’enregistrement de l’association, l’identité du responsable du traitement sera actualisée.`,
          `Si un délégué à la protection des données est désigné, ses coordonnées seront également communiquées.`
        ]
      },
      {
        heading: 'Article 3 — Données collectées et protection des données sensibles',
        body: [
          `Selon les services utilisés, Queer Services peut collecter les données suivantes :`,
          `• Les informations d’identification et de contact : nom, prénom, pseudonyme, photographie, adresse électronique et téléphone.`,
          `• Les informations de profil : compétences, services proposés ou recherchés, disponibilités et zone géographique.`,
          `• Les informations liées à la vie associative : adhésion, fonctions, participation aux activités et cotisations éventuelles.`,
          `• Les informations liées aux prestations : messages, réservations, rendez-vous, paiements et évaluations.`,
          `• Les données techniques et de sécurité : adresse IP, journaux de connexion, signalements et informations relatives aux appareils utilisés.`,
          `Une attention particulière est portée aux informations susceptibles de révéler l’orientation sexuelle, l’état de santé ou d’autres données sensibles.`,
          `L’inscription sur Queer Services ne constitue pas une déclaration d’appartenance à la communauté LGBTQIA+. Aucune personne n’est tenue de révéler son orientation sexuelle ou son identité de genre pour accéder aux fonctionnalités générales.`,
          `Les données sensibles ne peuvent être traitées que lorsqu’une base légale et une condition particulière prévues par le RGPD le permettent.`
        ]
      },
      {
        heading: 'Article 4 — Finalités et bases légales',
        body: [
          `Queer Services utilise les données personnelles pour gérer les comptes et les adhésions, permettre la mise en relation, faciliter les échanges et les réservations, gérer les paiements, assurer l’assistance, prévenir les abus et respecter ses obligations légales.`,
          `Selon les traitements concernés, les bases légales sont l’exécution des CGU ou de l’adhésion, le respect d’une obligation légale, l’intérêt légitime ou le consentement.`,
          `Les communications facultatives et les traceurs non essentiels reposent sur le consentement lorsque celui-ci est requis.`,
          `Les informations obligatoires sont signalées lors de leur collecte. Leur absence peut empêcher l’utilisation de certaines fonctionnalités. Les informations facultatives peuvent être omises.`
        ]
      },
      {
        heading: 'Article 5 — Destinataires et confidentialité des données',
        body: [
          `Les données personnelles sont accessibles uniquement aux personnes habilitées, dans la limite des informations nécessaires à leurs missions.`,
          `Elles peuvent être communiquées aux membres et bénévoles autorisés, aux utilisateurs concernés par une prestation, aux prestataires techniques et de paiement ou aux autorités compétentes lorsque la loi le prévoit.`,
          `Queer Services ne vend pas les données personnelles de ses utilisateurs, membres ou adhérent·es.`,
          `Les personnes ayant accès à des informations confidentielles s’engagent à ne pas les divulguer ni les utiliser à des fins personnelles. Cette obligation demeure applicable après la fin de leur adhésion ou de leurs fonctions, tant que les informations conservent leur caractère confidentiel.`
        ]
      },
      {
        heading: 'Article 6 — Engagements éthiques des membres et adhérent·es',
        body: [
          `Les membres, adhérent·es, bénévoles et dirigeant·es s’engagent à respecter les valeurs d’Ubuntu, de solidarité, d’entraide, de confiance et d’inclusion qui fondent Queer Services.`,
          `Ils s’engagent notamment à :`,
          `• Faire preuve d’intégrité, de probité et d’honnêteté dans leurs activités associatives.`,
          `• Respecter la dignité, la vie privée et les choix des autres personnes.`,
          `• Adopter une attitude d’écoute bienveillante, sans jugement ni discrimination.`,
          `• Préserver les intérêts légitimes et la réputation de l’association.`,
          `• S’abstenir de tout comportement harcelant, menaçant, humiliant ou discriminatoire.`,
          `• Prévenir les conflits d’intérêts et signaler rapidement toute situation susceptible de compromettre leur impartialité.`,
          `Ces engagements ne limitent pas le droit de formuler des critiques de bonne foi, de signaler des dysfonctionnements ou d’exercer les droits reconnus par la loi.`
        ]
      },
      {
        heading: 'Article 7 — Utilisation des coordonnées et représentation de l’association',
        body: [
          `Les coordonnées et les informations personnelles recueillies dans le cadre de Queer Services ne peuvent être utilisées à des fins étrangères à celles pour lesquelles elles ont été collectées.`,
          `Il est notamment interdit de constituer des fichiers personnels à partir des données de l’association, de communiquer ces informations à des tiers sans autorisation appropriée ou de les utiliser pour une prospection commerciale non autorisée.`,
          `Aucun membre ou adhérent ne peut agir, négocier, prendre un engagement ou s’exprimer officiellement au nom de Queer Services sans habilitation expresse et écrite de la présidence ou de l’organe compétent.`,
          `Cette disposition ne limite pas la liberté d’expression à titre personnel.`
        ]
      },
      {
        heading: 'Article 8 — Confidentialité des accompagnements et des échanges',
        body: [
          `Toute personne participant à une mission d’accompagnement, de mise en relation ou d’assistance s’engage à respecter la confidentialité des informations recueillies et à adopter une posture d’écoute bienveillante.`,
          `Les informations personnelles ne sont partagées qu’avec les personnes habilitées, lorsque cela est nécessaire à la mission, avec l’accord approprié de la personne concernée ou dans les autres cas prévus par la loi.`,
          `Les documents confiés doivent être conservés dans des conditions adaptées de sécurité, restitués selon les modalités convenues et supprimés ou anonymisés lorsqu’ils ne sont plus nécessaires, sous réserve des obligations légales de conservation.`,
          `Les membres et bénévoles utilisent les canaux de communication autorisés par l’association. Ils partagent les informations utiles à leurs missions sans diffuser inutilement les données personnelles.`,
          `Lorsqu’un bénévole ne peut plus assurer une mission acceptée, il est invité à prévenir suffisamment tôt les personnes concernées afin de faciliter la continuité de l’accompagnement.`
        ]
      },
      {
        heading: 'Article 9 — Profils, messagerie et mise en relation',
        body: [
          `Les informations volontairement publiées sur un profil peuvent être visibles par d’autres utilisateurs, selon les fonctionnalités et les paramètres proposés par la plateforme.`,
          `Les utilisateurs sont invités à ne publier que les informations nécessaires à la mise en relation.`,
          `Les messages privés ne sont pas destinés à être rendus publics. Un accès limité et justifié peut néanmoins être nécessaire pour traiter un signalement, prévenir une fraude, assurer la sécurité ou respecter une obligation légale.`,
          `Queer Services peut proposer automatiquement des profils ou des services en fonction des compétences, des disponibilités, des recherches ou des zones géographiques renseignées.`,
          `Si une fonctionnalité impliquant une décision exclusivement automatisée produisant des effets juridiques ou affectant significativement les personnes est mise en place, une information spécifique et les garanties requises seront prévues.`
        ]
      },
      {
        heading: 'Article 10 — Conservation et suppression des données',
        body: [
          `Les données personnelles sont conservées pendant une durée proportionnée à leur finalité et conformément aux obligations légales applicables.`,
          `Les données de compte et d’adhésion sont conservées pendant leur période d’utilisation, puis supprimées ou archivées lorsque cela est justifié.`,
          `Les messages, réservations, transactions, signalements et journaux techniques sont conservés pendant les durées nécessaires à leur traitement, à la sécurité du service et aux éventuelles obligations légales.`,
          `Les documents comptables sont conservés pendant dix ans lorsque cette durée légale s’applique.`,
          `Toute personne peut demander la suppression de ses données lorsque les conditions légales sont réunies. Certaines informations peuvent néanmoins être conservées pour respecter une obligation légale ou gérer un litige.`,
          `Les durées précises applicables à chaque catégorie seront fixées en fonction des traitements effectivement mis en œuvre.`
        ]
      },
      {
        heading: 'Article 11 — Sécurité, hébergement et transferts de données',
        body: [
          `Queer Services met en œuvre des mesures techniques et organisationnelles adaptées pour protéger les données personnelles contre les accès non autorisés, les pertes, les divulgations et les utilisations abusives.`,
          `Les personnes habilitées doivent respecter les consignes de sécurité et signaler rapidement tout incident ou toute suspicion de violation de données.`,
          `En cas de violation, Queer Services applique les obligations de documentation, de notification et d’information prévues par le RGPD.`,
          `Les informations relatives aux prestataires techniques, à la localisation des données et aux éventuels transferts hors de l’Espace économique européen seront précisées après vérification des services et contrats effectivement utilisés.`
        ]
      },
      {
        heading: 'Article 12 — Cookies et collecte indirecte',
        body: [
          `Queer Services peut utiliser des cookies nécessaires au fonctionnement de son site et, lorsque les utilisateurs y consentent si cela est requis, des traceurs facultatifs.`,
          `Les utilisateurs doivent pouvoir gérer leurs préférences et retirer leur consentement.`,
          `Certaines données peuvent également être obtenues indirectement, notamment lorsqu’une personne est mentionnée dans un message, un avis, une réservation ou un signalement, ou lorsqu’un prestataire de paiement transmet le statut d’une transaction.`,
          `Les personnes concernées sont informées de ces traitements conformément au RGPD, sous réserve des exceptions légales applicables.`
        ]
      },
      {
        heading: 'Article 13 — Signalements, manquements et radiation',
        body: [
          `Tout utilisateur, membre, adhérent·e ou bénévole peut signaler une violation présumée de la confidentialité, une utilisation abusive de données personnelles, un comportement discriminatoire ou un manquement aux engagements éthiques.`,
          `Les signalements sont adressés à contact@queerservices.fr et examinés avec discrétion, impartialité et dans le respect des droits des personnes concernées.`,
          `Les signalements effectués de bonne foi ne doivent donner lieu à aucune mesure de représailles.`,
          `Tout manquement aux obligations associatives peut entraîner les mesures prévues par les statuts et le règlement intérieur : rappel des règles, avertissement, restriction des accès, suspension de responsabilités ou procédure disciplinaire.`,
          `En cas de manquement grave ou répété, Queer Services se réserve le droit d’engager une procédure pouvant conduire à la radiation du membre ou de l’adhérent·e concerné·e.`,
          `La radiation est prononcée par l’organe compétent, selon la procédure prévue par les statuts et le règlement intérieur. La personne concernée doit être informée des faits reprochés et pouvoir présenter ses observations avant toute décision définitive.`,
          `Les mesures prises doivent être proportionnées à la gravité des faits.`
        ]
      },
      {
        heading: 'Article 14 — Droits des personnes et réclamations',
        body: [
          `Conformément au RGPD, chaque personne dispose, dans les conditions prévues par la réglementation, de droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité.`,
          `Lorsqu’un traitement repose sur son consentement, elle peut le retirer à tout moment.`,
          `Pour exercer ces droits ou poser une question relative à ses données personnelles : contact@queerservices.fr`,
          `Queer Services répond en principe dans un délai d’un mois à compter de la réception de la demande, sous réserve des prolongations légalement autorisées.`,
          `Toute personne estimant que ses données ne sont pas traitées conformément à la réglementation peut adresser une réclamation à la Commission nationale de l’informatique et des libertés (CNIL) : https://www.cnil.fr/.`
        ]
      },
      {
        heading: 'Article 15 — Adhésion et modification de la politique',
        body: [
          `Les membres, adhérent·es, bénévoles et dirigeant·es sont informés des obligations de confidentialité et de protection des données applicables à leurs activités.`,
          `L’adhésion implique le respect des statuts, du règlement intérieur et des règles associatives régulièrement adoptées et portées à la connaissance des membres.`,
          `Les personnes ayant accès à des données personnelles dans le cadre de leurs fonctions peuvent être tenues de signer un engagement spécifique de confidentialité.`,
          `Queer Services peut modifier la présente politique afin de tenir compte de l’évolution de ses activités, de ses fonctionnalités, de ses prestataires ou de la réglementation.`,
          `La date de mise à jour figure en tête du document. Les personnes concernées sont informées des modifications lorsque cela est nécessaire.`
        ]
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
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const page = PAGES[slug];

  const downloadMyData = async () => {
    if (!user) return;
    setExporting(true);
    const [profileResult, badgesResult, reviewsResult, connectionsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('profile_badges').select('badge:badges(*)').eq('profile_id', user.id),
      supabase.from('reviews').select('*').eq('author_id', user.id),
      supabase.from('connections').select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    ]);
    setExporting(false);
    if (profileResult.error) return;
    const content = JSON.stringify({ exported_at: new Date().toISOString(), profile: profileResult.data, badges: badgesResult.data, reviews_authored: reviewsResult.data, connections: connectionsResult.data }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `queer-services-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
          <p className="text-sm text-neutral-500">{page.intro}</p>
          {slug === 'confidentialite' && user && (
            <section className="mt-5 rounded-2xl bg-primary-50 p-4">
              <h2 className="font-display text-base font-semibold text-primary-900">Vos données</h2>
              <p className="mt-1 text-sm text-primary-800">Téléchargez une copie de vos données personnelles au format JSON.</p>
              <button onClick={downloadMyData} disabled={exporting} className="btn-primary mt-3 w-full justify-center"><Download size={16} /> {exporting ? 'Préparation…' : 'Télécharger mes données'}</button>
            </section>
          )}

          <div className="mt-6 space-y-6">
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-display text-base font-semibold text-neutral-900">{s.heading}</h2>
                <div className="mt-2 space-y-2">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-neutral-500">
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
