import { useEffect, useState } from 'react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Profile, Badge, Review, Connection } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BadgeList } from '@/components/BadgeChip';
import { TrustPanel } from '@/components/TrustPanel';
import { AverageStars, StarRating } from '@/components/StarRating';
import { avg, formatDate, timeAgo } from '@/lib/utils';
import {
  Pencil,
  MapPin,
  Users,
  Building2,
  MessageCircle,
  Mail,
  Phone,
  Star,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Settings,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';

interface ConnectionWithOther extends Connection {
  other?: Profile;
}

interface ReviewWithAuthor extends Review {
  author?: { id: string; display_name: string; photo_url: string | null };
}

export function MyProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { path, navigate } = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [connections, setConnections] = useState<ConnectionWithOther[]>([]);
  const [loading, setLoading] = useState(true);
  // On-site confirmation right after finishing onboarding (see
  // OnboardingPage's finishOnboarding, which navigates here with this flag).
  const [showWelcome, setShowWelcome] = useState(() => path.includes('bienvenue=1'));

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    if (!profile) {
      navigate('/onboarding');
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [pbRes, revRes, connRes] = await Promise.all([
        supabase.from('profile_badges').select('badge:badges(*)').eq('profile_id', user.id),
        supabase
          .from('reviews')
          .select('*, author:profiles!reviews_author_id_fkey(id, display_name, photo_url)')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('connections').select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setBadges(((pbRes.data ?? []) as unknown as { badge: Badge }[]).map((x) => x.badge).filter(Boolean));
      setReviews((revRes.data ?? []) as ReviewWithAuthor[]);
      const conns = (connRes.data ?? []) as Connection[];
      const otherIds = Array.from(new Set(conns.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))));
      let otherMap = new Map<string, Profile>();
      if (otherIds.length > 0) {
        const { data: others } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).in('id', otherIds);
        for (const o of (others ?? []) as Profile[]) otherMap.set(o.id, o);
      }
      setConnections(conns.map((c) => ({ ...c, other: otherMap.get(c.user_a === user.id ? c.user_b : c.user_a) })));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, profile, navigate]);

  if (loading || !profile) {
    return <div className="container-app py-16"><div className="card h-96 animate-pulse bg-neutral-100" /></div>;
  }

  const avgRating = avg(reviews.map((r) => r.rating));
  const typeMeta = {
    particulier: { icon: Users, label: 'Particulier·e' },
    asso: { icon: Building2, label: 'Association / structure' },
  }[profile.account_type];

  return (
    <div className="animate-fade-in container-app py-6 max-w-2xl mx-auto">
      {showWelcome && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 p-4">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-900">Bienvenue, votre inscription est terminée !</p>
            <p className="mt-0.5 text-xs text-primary-700">Votre profil est prêt, vous pouvez le compléter à tout moment.</p>
          </div>
          <button
            onClick={() => {
              setShowWelcome(false);
              navigate('/profil');
            }}
            aria-label="Fermer"
            className="rounded-lg p-1 text-primary-400 hover:bg-primary-100"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/annuaire')}
          aria-label="Retour à l'annuaire"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-lg font-semibold text-neutral-900">Profil</h1>
        <button
          onClick={() => navigate('/parametres')}
          aria-label="Réglages"
          title="Réglages"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-6">
          {/* Main Card */}
          <div className="card overflow-hidden pb-8 pt-8">
            <div className="flex justify-center relative">
              <Avatar name={profile.display_name} src={profile.photo_url} size={112} className="bg-primary-600 text-white" />
              {profile.verification_status === 'verified' && (
                <div className="absolute bottom-0 right-1/2 translate-x-12 translate-y-1 rounded-full bg-white p-0.5 shadow-sm">
                  <ShieldCheck size={20} className="text-emerald-500 fill-emerald-50" />
                </div>
              )}
            </div>
            
            <div className="px-6 mt-6 text-center">
              <h1 className="font-display text-3xl font-bold text-neutral-900">{profile.display_name}</h1>
                {typeMeta && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                    {typeMeta.label}
                  </span>
                )}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                {profile.city && (
                  <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-error-500" /> {profile.city}</span>
                )}
              </div>

              {profile.bio && (
                <p className="mt-6 text-[15px] italic text-neutral-600 leading-relaxed whitespace-pre-line px-2">
                  "{profile.bio}"
                </p>
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => navigate('/profil/modifier')} className="btn-primary w-full">
                  Modifier mon profil
                </button>
                <button 
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }} 
                  className="btn-outline w-full sm:w-auto text-error-600 hover:bg-error-50 border-error-200"
                >
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </div>

              {profile.skills.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 mb-3">Compétences proposées</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {profile.skills.map((s) => (
                      <span key={s} className="rounded-md bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {profile.needs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Recherche</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {profile.needs.map((s) => (
                      <span key={s} className="rounded-md bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 border border-secondary-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Additional info if applicable */}
          {(profile.intervention_zone || profile.indicative_rates) && (
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">Informations complémentaires</h2>
              <div className="flex flex-col gap-4 text-sm text-neutral-600">
                {profile.intervention_zone && (
                  <div>
                    <span className="block text-xs text-neutral-400 mb-1">Zone d'intervention</span>
                    <span className="font-medium text-neutral-900">{profile.intervention_zone}</span>
                  </div>
                )}
                {profile.indicative_rates && (
                  <div>
                    <span className="block text-xs text-neutral-400 mb-1">Tarifs indicatifs</span>
                    <span className="font-medium text-neutral-900">{profile.indicative_rates}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <TrustPanel profile={profile} badges={badges} reviewCount={reviews.length} avgRating={avgRating} />

          {/* Mises en relation */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">Mises en relation</h2>
            {connections.length === 0 ? (
              <div className="rounded-2xl bg-neutral-50 p-8 text-center">
                <MessageCircle size={28} className="mx-auto text-neutral-300" />
                <p className="mt-3 text-sm text-neutral-500">Aucune mise en relation pour l'instant.</p>
                <button onClick={() => navigate('/annuaire')} className="btn-outline btn-sm mt-4">
                  Explorer l'annuaire <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages/${c.id}`)}
                    className="flex w-full items-center gap-4 rounded-xl border border-neutral-100 p-4 text-left hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                  >
                    <Avatar name={c.other?.display_name ?? 'Inconnu'} src={c.other?.photo_url} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-[15px] font-semibold text-neutral-900">{c.other?.display_name ?? 'Membre'}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-400 shrink-0">{timeAgo(c.created_at)}</p>
                      </div>
                      {c.service_label && <p className="truncate text-[13px] text-neutral-500 mt-1">{c.service_label}</p>}
                    </div>
                    <StatusBadge status={c.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avis reçus */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">Avis reçus</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun avis pour le moment.</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-neutral-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <Avatar name={r.author?.display_name ?? 'Anonyme'} src={r.author?.photo_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-bold text-neutral-900 truncate pr-2">{r.author?.display_name ?? 'Anonyme'}</p>
                          <p className="text-[13px] font-medium text-neutral-400 shrink-0">{timeAgo(r.created_at)}</p>
                        </div>
                        <div className="mt-0.5">
                          <StarRating value={r.rating} size={13} />
                        </div>
                        {r.comment && <p className="mt-2.5 text-[15px] text-neutral-700 leading-relaxed">{r.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges obtenus */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">Badges obtenus</h2>
            {badges.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun badge pour le moment.</p>
            ) : (
              <BadgeList badges={badges} className="gap-2" />
            )}
          </div>
        </div>
      </div>
  );
}

function StatusBadge({ status }: { status: Connection['status'] }) {
  const map = {
    pending: { icon: Clock, label: 'En attente', cls: 'bg-warning-100 text-warning-700' },
    accepted: { icon: CheckCircle2, label: 'Acceptée', cls: 'bg-primary-100 text-primary-700' },
    completed: { icon: CheckCircle2, label: 'Terminée', cls: 'bg-success-100 text-success-700' },
    cancelled: { icon: XCircle, label: 'Annulée', cls: 'bg-neutral-100 text-neutral-600' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map.cls}`}>
      <map.icon size={12} /> {map.label}
    </span>
  );
}
