// Curated, not derived from free-text `profiles.city` — matches the city
// list EventsPage already uses (see src/pages/EventsPage.tsx's CITIES),
// so we don't end up with a different, drifting notion of "our cities" per
// page. Keeps the /annuaire/:categorie/:ville URL space bounded instead of
// exploding into one thin page per every city a member ever typed.
export interface TargetCity {
  slug: string;
  label: string;
}

export const TARGET_CITIES: TargetCity[] = [
  { slug: 'paris', label: 'Paris' },
  { slug: 'marseille', label: 'Marseille' },
  { slug: 'lyon', label: 'Lyon' },
  { slug: 'bordeaux', label: 'Bordeaux' },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Free-text city match: "Lyon 3e", "Lyon, France" and "lyon" all match the
// "Lyon" target city; "Villeurbanne" doesn't.
export function cityMatches(profileCity: string | null | undefined, target: TargetCity): boolean {
  if (!profileCity) return false;
  return normalize(profileCity).includes(normalize(target.label));
}
