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
  siteName: 'Queer Service',
  siteUrl: 'https://queerservice.fr',

  // Publisher identity
  legalName: 'À COMPLÉTER (raison sociale ou nom du responsable de publication)',
  legalForm: 'À COMPLÉTER (ex. association loi 1901, SAS, entreprise individuelle…)',
  siret: 'À COMPLÉTER',
  rcs: 'À COMPLÉTER',
  shareCapital: 'À COMPLÉTER',
  address: 'À COMPLÉTER (adresse postale du siège)',
  publicationDirector: 'À COMPLÉTER',

  // Contact
  contactEmail: 'contact@queerservice.fr',
  dpoEmail: 'donnees@queerservice.fr',

  // Hosting
  frontendHost: 'À COMPLÉTER (ex. Netlify, Vercel, OVHcloud…)',
  frontendHostAddress: 'À COMPLÉTER',
  backendHost: 'Supabase Inc.',
  backendHostDetail:
    'Base de données et authentification hébergées via Supabase, avec instance configurée en région Union Européenne.',

  // Misc
  mediationEntity: 'À COMPLÉTER (le cas échéant, médiateur de la consommation compétent)',
  lastUpdated: '25 juillet 2026',
} as const;
