import { Building2, Heart, HandHeart, ShieldCheck, Users } from 'lucide-react';
import type { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

// Remplace le badge « Compte vérifié » (tous les comptes le sont) par des badges
// qui distinguent les profils : entreprise, communauté LGBTQIA+, allié·e gay friendly.
// `isCommunityMember` / `isAlly` ne sont connus que des membres connectés.
export function IdentityBadges({
  accountType,
  isCommunityMember,
  isAlly,
  showType = false,
  size = 'md',
  className,
}: {
  accountType: AccountType;
  isCommunityMember?: boolean | null;
  isAlly?: boolean | null;
  showType?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sm = size === 'sm';
  const base = cn(
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-bold shadow-sm',
    sm ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs',
  );
  const icon = sm ? 10 : 13;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      {accountType === 'pro' ? (
        <span className={cn(base, 'border-primary-200 bg-primary-50 text-primary-700')}>
          <Building2 size={icon} /> Pro
        </span>
      ) : (
        showType && (
          <span className={cn(base, 'border-gold-hairline bg-paper-base text-ink-base')}>
            <Users size={icon} /> Particulier·e
          </span>
        )
      )}
      {isCommunityMember === true && (
        <span className={cn(base, 'border-purple-200 bg-purple-50 text-purple-700')}>
          <Heart size={icon} className="fill-current" /> Communauté
        </span>
      )}
      {isCommunityMember !== true && isAlly === true && (
        <span className={cn(base, 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          <HandHeart size={icon} /> Gay friendly
        </span>
      )}
    </div>
  );
}

// Pastilles rondes posées sur le bord de la photo, comme l'ancien bouclier « vérifié » :
// bouclier (compte vérifié), entreprise, communauté, gay friendly.
export function AvatarBadges({
  accountType,
  isCommunityMember,
  isAlly,
  verified = false,
  size = 'md',
}: {
  accountType: AccountType;
  isCommunityMember?: boolean | null;
  isAlly?: boolean | null;
  verified?: boolean;
  size?: 'sm' | 'md';
}) {
  const sm = size === 'sm';
  const items: { key: string; label: string; node: JSX.Element }[] = [];
  const ic = sm ? 11 : 18;
  if (verified) items.push({ key: 'verified', label: 'Compte vérifié', node: <ShieldCheck size={ic} className="text-patina-deep" /> });
  if (accountType === 'pro') items.push({ key: 'pro', label: 'Entreprise', node: <Building2 size={ic} className="text-primary-700" /> });
  if (isCommunityMember === true) items.push({ key: 'community', label: 'Communauté LGBTQIA+', node: <Heart size={ic} className="fill-purple-600 text-purple-600" /> });
  else if (isAlly === true) items.push({ key: 'ally', label: 'Gay friendly', node: <HandHeart size={ic} className="text-emerald-600" /> });
  if (!items.length) return null;
  return (
    <div className={cn('absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 translate-y-1/2 items-center', sm ? 'gap-0.5' : 'gap-1.5')}>
      {items.map((b) => (
        <span
          key={b.key}
          title={b.label}
          aria-label={b.label}
          className={cn('flex items-center justify-center rounded-full border border-gold-hairline bg-white shadow-sm', sm ? 'h-5 w-5' : 'h-8 w-8')}
        >
          {b.node}
        </span>
      ))}
    </div>
  );
}

// Légende en texte des pastilles : dit ce que chaque badge représente.
export function BadgeLegend({
  accountType,
  isCommunityMember,
  isAlly,
  verified = false,
  size = 'md',
  className,
}: {
  accountType: AccountType;
  isCommunityMember?: boolean | null;
  isAlly?: boolean | null;
  verified?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sm = size === 'sm';
  const items: { key: string; text: string; node: JSX.Element }[] = [];
  const ic = sm ? 10 : 14;
  if (verified) items.push({ key: 'verified', text: sm ? 'Vérifié' : 'Compte vérifié', node: <ShieldCheck size={ic} className="text-patina-deep" /> });
  if (accountType === 'pro') items.push({ key: 'pro', text: sm ? 'Entreprise' : 'Compte entreprise', node: <Building2 size={ic} className="text-primary-700" /> });
  if (isCommunityMember === true) items.push({ key: 'community', text: sm ? 'Communauté' : 'Membre de la communauté LGBTQIA+', node: <Heart size={ic} className="fill-purple-600 text-purple-600" /> });
  else if (isAlly === true) items.push({ key: 'ally', text: sm ? 'Gay friendly' : 'Allié·e gay friendly', node: <HandHeart size={ic} className="text-emerald-600" /> });
  if (!items.length) return null;
  return (
    <ul className={cn('flex flex-wrap items-center justify-center text-ink-muted', sm ? 'gap-x-2 gap-y-0.5 text-[9px]' : 'gap-x-3 gap-y-1 text-[12px]', className)}>
      {items.map((b) => (
        <li key={b.key} className="inline-flex items-center gap-1 font-medium">
          {b.node} {b.text}
        </li>
      ))}
    </ul>
  );
}
