/*
 * Centralised legal / company information used across the legal pages.
 *
 * ⚠️ IMPORTANT — TO COMPLETE BEFORE GOING LIVE
 * The fields marked "À COMPLÉTER" are placeholders. French law (mentions
 * légales — LCEN art. 6-III) requires accurate, real information about the
 * publisher, host, and a real contact. Fill these in with your actual
 * legal entity details (or your own name + address if this is an
 * individual project) before launching publicly. Consider having a
 * lawyer or a service like a legal-tech (e.g. one specialised in
 * associations/RGPD) review the final CGU and privacy policy — this file
 * and the legal pages are a solid, good-faith starting template, not a
 * substitute for legal counsel, especially given the platform processes
 * special-category data (sexual orientation / gender identity, RGPD art. 9).
 */

export const legalConfig = {
  siteName: 'Queer Services',
  siteUrl: 'https://www.queerservices.fr',

  // Publisher identity
  legalName: 'QUEER SERVICES',
  legalForm: 'association déclarée (loi du 1er juillet 1901)',
  siren: '131 113 466',
  siret: '131 113 466 00018',
  tva: 'FR75131113466',
  rna: 'W751286301',
  rnaDate: '24/09/2026',
  rcs: 'non inscrite (association)',
  shareCapital: 'sans objet (association)',
  address: '12 rue Bichat, 75010 Paris, France',
  publicationDirector: 'Sandrine Khoto-Thinu (représentante légale)',

  // Contact
  contactEmail: 'contact@queerservices.fr',
  dpoEmail: 'contact@queerservices.fr',

  // Hosting
  frontendHost: 'Vercel Inc.',
  frontendHostAddress: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
  backendHost: 'Supabase Inc.',
  backendHostDetail:
    'Base de données et authentification hébergées via Supabase, avec instance configurée en région Union Européenne.',

  // Misc
  mediationEntity: 'À COMPLÉTER (le cas échéant, médiateur de la consommation compétent)',
  lastUpdated: '12 octobre 2026',
} as const;
