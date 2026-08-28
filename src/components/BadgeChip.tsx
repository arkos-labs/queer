import { cn } from '@/lib/utils';
import type { Badge as BadgeType } from '@/lib/types';
import { ShieldCheck, BadgeCheck, Accessibility, Sparkles } from 'lucide-react';

const iconMap: Record<string, typeof ShieldCheck> = {
  ShieldCheck,
  BadgeCheck,
  Accessibility,
  Sparkles,
};

const styleMap: Record<string, string> = {
  safe: 'bg-success-100 text-success-700 ring-success-200',
  'identite-verifiee': 'bg-primary-100 text-primary-600 ring-primary-200',
  'handi-accueillant': 'bg-accent-100 text-accent-700 ring-accent-200',
  'inclusif-texture': 'bg-secondary-100 text-secondary-700 ring-secondary-200',
};

export function BadgeChip({ badge, className }: { badge: BadgeType; className?: string }) {
  const Icon = iconMap[badge.icon ?? ''] ?? ShieldCheck;
  const style = styleMap[badge.code] ?? 'bg-neutral-100 text-neutral-900 ring-neutral-200';
  return (
    <span
      className={cn('badge-chip ring-1', style, className)}
      title={badge.description ?? badge.label}
    >
      <Icon size={14} />
      {badge.label}
    </span>
  );
}

export function BadgeList({ badges, className }: { badges: BadgeType[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map((b) => (
        <BadgeChip key={b.id} badge={b} />
      ))}
    </div>
  );
}
