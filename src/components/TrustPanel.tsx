import type { Profile, Badge as BadgeType } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, ShieldQuestion } from 'lucide-react';

interface TrustPanelProps {
  profile: Profile;
  badges: BadgeType[];
  reviewCount: number;
  avgRating: number;
}

function Row({
  emoji,
  label,
  ok,
  detail,
}: {
  emoji: string;
  label: string;
  ok: boolean | null;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-base leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        <p
          className={
            'mt-0.5 text-xs ' +
            (ok === true ? 'text-success-600' : ok === false ? 'text-neutral-400' : 'text-neutral-500')
          }
        >
          {detail}
        </p>
      </div>
    </div>
  );
}

export function TrustPanel({ profile, badges, reviewCount, avgRating }: TrustPanelProps) {
  const hasSafeBadge = badges.some((b) => b.code === 'safe');
  const isVerified = profile.verification_status === 'verified';

  return (
    <div className="card p-6 md:p-8">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-primary-600" />
        <h3 className="font-display text-base font-semibold text-neutral-900">Confiance &amp; sécurité</h3>
      </div>

      <div className="mt-2 divide-y divide-neutral-100">
        <Row
          emoji="✅"
          label="Identité du professionnel vérifiée"
          ok={isVerified ? true : profile.verification_status === 'rejected' ? false : null}
          detail={
            isVerified
              ? 'Identité vérifiée par notre équipe.'
              : profile.verification_status === 'pending'
                ? 'Vérification en cours.'
                : profile.verification_status === 'rejected'
                  ? 'Vérification refusée.'
                  : 'Pas encore vérifiée.'
          }
        />

        <Row
          emoji="🏳️‍🌈"
          label="Engagement à respecter la charte d'inclusion"
          ok={profile.charte_accepted}
          detail={
            profile.charte_accepted
              ? `Charte acceptée${profile.charte_accepted_at ? ' le ' + formatDate(profile.charte_accepted_at) : ''}.`
              : 'Charte non acceptée.'
          }
        />

        <Row
          emoji="⭐"
          label="Notes et avis de la communauté"
          ok={reviewCount > 0 ? true : null}
          detail={
            reviewCount > 0
              ? `${avgRating.toFixed(1)} / 5 sur ${reviewCount} avis.`
              : 'Aucun avis pour le moment.'
          }
        />

        <Row
          emoji="📅"
          label="Dernière vérification du profil"
          ok={!!profile.verified_at}
          detail={profile.verified_at ? formatDate(profile.verified_at) : 'Jamais vérifié.'}
        />

        <Row
          emoji="🛡️"
          label='Badge "Safe" communautaire'
          ok={hasSafeBadge}
          detail={
            hasSafeBadge
              ? 'Attribué automatiquement après plusieurs retours positifs.'
              : 'Attribué automatiquement à partir de 3 avis avec une moyenne ≥ 4★.'
          }
        />
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-400">
        <ShieldQuestion size={13} className="mt-0.5 shrink-0" />
        Ces indicateurs sont des repères communautaires et ne remplacent pas une vérification professionnelle
        officielle.
      </p>
    </div>
  );
}
