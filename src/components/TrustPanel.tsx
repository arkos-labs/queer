import type { PublicProfile, Badge as BadgeType } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, Info, CheckCircle2, Handshake, Star, Clock, Heart, Linkedin, ExternalLink } from 'lucide-react';
import { ReactNode } from 'react';

interface TrustPanelProps {
  profile: PublicProfile;
  badges: BadgeType[];
  reviewCount: number;
  avgRating: number;
}

function Row({
  icon,
  label,
  detail,
  color = 'bg-neutral-100 text-neutral-500',
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' + color}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-neutral-900">{label}</p>
        <p className="mt-0.5 text-[13px] text-neutral-500">
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
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={20} className="text-primary-600" />
        <h3 className="font-display text-lg font-bold text-neutral-900">Confiance & sécurité</h3>
      </div>

      <div className="flex flex-col gap-2">
        <Row
          icon={<CheckCircle2 size={18} />}
          color="bg-success-50 text-success-600"
          label="Compte vérifié"
          detail={
            isVerified
              ? 'E-mail confirmé par code'
              : 'Pas encore vérifié'
          }
        />

        <Row
          icon={<Handshake size={18} />}
          color="bg-yellow-50 text-yellow-600"
          label="Charte d'inclusion"
          detail={
            profile.charte_accepted
              ? `Acceptée${profile.charte_accepted_at ? ' le ' + formatDate(profile.charte_accepted_at) : ''}`
              : 'Non acceptée'
          }
        />

        <Row
          icon={<Star size={18} />}
          color="bg-success-50 text-success-600"
          label="Notes de la communauté"
          detail={
            reviewCount > 0
              ? `${avgRating.toFixed(1)} / 5 sur ${reviewCount} avis`
              : 'Aucun avis pour le moment'
          }
        />

        <Row
          icon={<Clock size={18} />}
          color="bg-blue-50 text-blue-600"
          label="Dernière vérification"
          detail={profile.verified_at ? formatDate(profile.verified_at) : 'Jamais vérifiée'}
        />

        {hasSafeBadge && (
          <Row
            icon={<Heart size={18} />}
            color="bg-rose-50 text-rose-600"
            label='Badge "Safe" communautaire'
            detail="Attribué après plusieurs retours positifs"
          />
        )}
      </div>

      {profile.linkedin_url && (
        <div className="mt-5 grid gap-2 border-t border-neutral-200 pt-5 sm:grid-cols-2">
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700 active:scale-[0.98]"
            >
              <Linkedin size={18} /> LinkedIn <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      <div className="mt-5 rounded-xl bg-indigo-50/80 p-4 text-[13px] text-indigo-800 flex items-start gap-2.5">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p className="leading-snug">
          Ces indicateurs sont des repères communautaires et ne remplacent pas une vérification professionnelle officielle.
        </p>
      </div>
    </div>
  );
}
