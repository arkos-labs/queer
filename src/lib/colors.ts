export interface CategoryColor {
  from: string;
  to: string;
  solid: string;
  text: string;
  bg: string;
  border: string;
  ring: string;
}

// Rainbow spectrum — each category gets a band of the pride rainbow
export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'maison-depannage': {
    from: '#EF4444',
    to: '#DC2626',
    solid: '#DC2626',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    ring: 'ring-red-400',
  },
  'sante-bien-etre': {
    from: '#F97316',
    to: '#EA580C',
    solid: '#EA580C',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    ring: 'ring-orange-400',
  },
  'administratif-juridique': {
    from: '#F59E0B',
    to: '#D97706',
    solid: '#D97706',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-amber-400',
  },
  'beaute-image': {
    from: '#22C55E',
    to: '#16A34A',
    solid: '#16A34A',
    text: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    ring: 'ring-green-400',
  },
  'education-coaching': {
    from: '#14B8A6',
    to: '#0D9488',
    solid: '#0D9488',
    text: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    ring: 'ring-teal-400',
  },
  'animaux': {
    from: '#3B82F6',
    to: '#2563EB',
    solid: '#2563EB',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    ring: 'ring-blue-400',
  },
  'transport-immobilier': {
    from: '#6366F1',
    to: '#4F46E5',
    solid: '#4F46E5',
    text: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    ring: 'ring-indigo-400',
  },
  'communaute': {
    from: '#EC4899',
    to: '#DB2777',
    solid: '#DB2777',
    text: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    ring: 'ring-pink-400',
  },
};

export function getCategoryColor(slug: string): CategoryColor {
  return CATEGORY_COLORS[slug] ?? {
    from: '#6B7280',
    to: '#4B5563',
    solid: '#4B5563',
    text: 'text-neutral-700',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    ring: 'ring-neutral-400',
  };
}

// Full rainbow gradient for accents
export const RAINBOW_GRADIENT =
  'linear-gradient(90deg, #EF4444 0%, #F97316 12.5%, #F59E0B 25%, #22C55E 37.5%, #14B8A6 50%, #3B82F6 62.5%, #6366F1 75%, #EC4899 100%)';
