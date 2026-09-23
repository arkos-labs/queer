# Recherche de mots-clés — Queer Service (2026-09-23)

Basé sur la taxonomie réelle de l'annuaire ([taxonomy.ts](../src/lib/taxonomy.ts)) et une recherche concurrentielle sur chaque verticale. Un mot-clé sans `[ville]` doit être décliné par ville (Paris, Lyon, Marseille, Toulouse, Bordeaux… selon la couverture réelle des membres).

Légende concurrence : 🟢 faible/quasi nulle · 🟡 moyenne · 🔴 élevée/saturée

---

## Priorité 1 — Différenciateur du site (entraide entre particuliers), quasi aucune concurrence directe

| Catégorie app | Mots-clés | Intent | Concurrence | Note |
|---|---|---|---|---|
| Maison & dépannage | `bricoleur LGBT friendly [ville]`, `plombier LGBT friendly`, `électricien LGBT friendly`, `femme/homme de ménage communauté LGBT`, `déménagement entre queers [ville]` | Transactionnel local | 🟢 | Aucun concurrent direct identifié — terrain vierge |
| Services entre particuliers | `baby-sitting communauté LGBT confiance`, `pet-sitting LGBT [ville]`, `garde d'animaux entre queers`, `aide administrative LGBT friendly` | Transactionnel | 🟢 | Seule concurrence : groupes Facebook non structurés, pas de SEO |
| Professionnels (freelance/créatif) | `expert-comptable LGBT friendly`, `photographe LGBT friendly [ville]`, `traducteur LGBT friendly`, `coach carrière LGBT friendly` | Transactionnel | 🟢 | Zéro contenu dédié trouvé — le mot-clé "LGBT friendly" + métier freelance est inoccupé |
| Positionnement / marque | `annuaire entraide LGBTQI+`, `plateforme entraide entre queers`, `trouver prestataire de confiance LGBT`, `services entre personnes queer` | Informationnel/navigationnel | 🟢 | Les concurrents existants sont soit associatifs (Centre LGBT), soit B2B (entrepreneurs-lgbt.com) — personne ne possède l'angle "entraide peer-to-peer" |

## Priorité 2 — Volume réel, concurrence gérable en long traîne localisé

| Catégorie app | Mots-clés | Intent | Concurrence | Note |
|---|---|---|---|---|
| Santé (médecins, gynéco, psy) | `médecin LGBT friendly [ville]`, `gynécologue trans friendly [ville]`, `psychologue LGBTQ+ [ville]`, `endocrinologue trans friendly` | Transactionnel local | 🟡 | Concurrents : medecin-gay-friendly.fr, wikitrans.co, psy-lgbt.fr — installés sur le générique, faibles sur le local hors grandes métropoles |
| Beauté & bien-être | `coiffeur LGBT friendly [ville]`, `salon de beauté inclusif [ville]`, `tatoueur LGBT friendly` | Local/commercial | 🟡 | Treatwell (badge LGBTQIA+), Frange Radicale, Space Hair — forts sur Paris/Marais, faibles ailleurs |
| Sport & coaching | `coach sportif LGBT friendly [ville]`, `salle de sport inclusive [ville]` | Local/commercial | 🟡 | MustCoach dominant sur "coach sportif gay" générique, quasi rien en régions |
| Immobilier | `agence immobilière LGBT friendly [ville hors Paris]`, `logement LGBT friendly [ville]` | Transactionnel local | 🟡 | La Garçonnière Immobilier verrouille Paris/Marais — vide ailleurs |
| Juridique/admin | `avocat LGBT friendly [ville]`, `avocat droits trans [ville]`, `notaire LGBT friendly` | Transactionnel | 🟡→🔴 | AFA LGBT+ / avocat-gay-friendly.fr bien référencés au national, jouable en local hors grandes villes |

## Priorité 3 — Saturé ou dominé par des institutions, faible ROI sur les têtes de mot-clé

| Catégorie app | Mots-clés | Intent | Concurrence | Note |
|---|---|---|---|---|
| Shopping / sorties | `restaurant LGBT friendly [ville]`, `bar LGBT friendly [ville]` | Local/commercial | 🔴 | PagesJaunes a des pages dédiées par ville ("restaurant-gay"), + vibes.lgbt, gay-sejour.com. Contenu utile pour l'annuaire mais mauvais ROI SEO à cibler frontalement |
| Ressources / numéros utiles | `numéro d'écoute LGBT`, `guide coming out`, `ressources trans France` | Informationnel | 🔴 | SOS homophobie, Fédération LGBTI+, guidelgbt.org très établis. Angle viable : hyper-local (`numéro utile [ville]`) plutôt que générique |
| Événements | `marche des fiertés [ville] 2027`, `pride [ville]` | Informationnel/saisonnier | 🔴 | Inter-LGBT / associations locales dominent les dates officielles. **Angle gagnable** : agrégateur temps réel d'événements communautaires hors grande Pride annuelle — les concurrents sont statiques, l'app peut gagner sur la fraîcheur ("événements LGBTQ+ [ville] cette semaine") |

---

## Recommandation de priorisation

1. **Construire d'abord sur la Priorité 1** — c'est l'angle unique du site (entraide entre particuliers), zéro concurrent structuré, aligné avec le vrai produit.
2. **Décliner la Priorité 2 par ville** dès qu'il y a une masse critique de prestataires réels dans ces catégories — sinon on référence des pages vides.
3. **Priorité 3 : contenu de remplissage**, pas d'investissement SEO dédié, sauf l'angle "fraîcheur" sur les événements.

## Prérequis technique (rappel)

Rien de ça ne peut ranker sans URLs indexables par catégorie/ville — aujourd'hui `/annuaire` est une page unique filtrée en state React (voir échange précédent). Il faut des routes du type `/annuaire/bricolage`, `/annuaire/bricolage/lyon` avec leur propre `title`/`description`/`canonical` via `useSEO`, sinon cette liste de mots-clés reste théorique.
