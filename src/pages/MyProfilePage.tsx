import { useEffect, useState } from 'react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { PublicProfile, Badge, Review, Connection } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BadgeList } from '@/components/BadgeChip';
import { TrustPanel } from '@/components/TrustPanel';
import { StarRating } from '@/components/StarRating';
import { avg, timeAgo } from '@/lib/utils';
import {
  MapPin,
  Users,
  Building2,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';

interface ConnectionWithOther extends Connection {
  other?: PublicProfile;
}

interface ReviewWithAuthor extends Review {
  author?: { id: string; display_name: string; photo_url: string | null };
}

export function MyProfilePage() {
  const { user, profile, signOut } = useAuth();
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
      const otherMap = new Map<string, PublicProfile>();
      if (otherIds.length > 0) {
        const { data: others } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).in('id', otherIds);
        for (const o of (others ?? []) as PublicProfile[]) otherMap.set(o.id, o);
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
    pro: { icon: Building2, label: 'Professionnel·le / structure' },
  }[profile.account_type];

  return (
    <div className="min-h-full bg-[#f7f5ff] pt-3 animate-fade-in">
      <div className="container-app max-w-2xl mx-auto pb-28">
      {showWelcome && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-gold-hairline bg-white p-4 shadow-soft">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-patina-deep" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-base">Bienvenue, votre inscription est terminée !</p>
            <p className="mt-0.5 text-xs text-ink-muted">Votre profil est prêt, vous pouvez le compléter à tout moment.</p>
          </div>
          <button
            onClick={() => {
              setShowWelcome(false);
              navigate('/profil');
            }}
            aria-label="Fermer"
            className="rounded-lg p-1 text-ink-muted hover:bg-paper-base transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
          {/* Main Card */}
          <div className="relative overflow-hidden rounded-[30px] border border-white bg-white pb-8 shadow-soft">
            {/* Elegant Kinpaku banner */}
            <div aria-hidden="true" className="h-28 sm:h-32 bg-paper-base relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1.5 z-10" style={{ background: 'linear-gradient(90deg, #FF0018 0%, #FFA52C 20%, #FFFF41 40%, #008018 60%, #0000F9 80%, #86007D 100%)' }} />
               <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-pink-500/10 blur-[50px]" />
               <div className="absolute -right-20 top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-[50px]" />
            </div>
            <div className="relative -mt-14 flex justify-center sm:-mt-16">
              <div className="rounded-full bg-white p-1.5 shadow-card">
                <Avatar name={profile.display_name} src={profile.photo_url} size={112} className="bg-paper-raised text-ink-muted border border-gold-hairline" />
              </div>
              {profile.verification_status === 'verified' && (
                <div className="absolute bottom-1 right-1/2 translate-x-12 translate-y-1 rounded-full bg-white p-0.5 shadow-sm border border-gold-hairline">
                  <ShieldCheck size={20} className="text-patina-deep" />
                </div>
              )}
            </div>
            
            <div className="px-6 mt-6 text-center">
              <h1 className="font-display text-3xl font-bold text-ink-base">{profile.display_name}</h1>
                {typeMeta && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-paper-base border border-gold-hairline px-3 py-1 text-xs font-semibold text-ink-base shadow-sm">
                    {typeMeta.label}
                  </span>
                )}
                {profile.verification_status === 'verified' && (
                  <span className="mt-2 ml-2 inline-flex items-center gap-1 rounded-full border border-success-200 bg-success-100 px-3 py-1 text-xs font-bold text-success-700 shadow-sm">
                    <ShieldCheck size={13} /> Compte vérifié
                  </span>
                )}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                {profile.city && (
                  <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-patina-deep" /> {profile.city}</span>
                )}
              </div>

              {profile.bio && (
                <p className="mt-6 text-[15px] italic text-ink-muted leading-relaxed whitespace-pre-line px-2">
                  "{profile.bio}"
                </p>
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => navigate('/profil/modifier')} className="flex w-full items-center justify-center rounded-2xl bg-ink-base px-6 py-4 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5">
                  Modifier mon profil
                </button>
                <button 
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }} 
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-error-200 bg-white px-6 py-4 font-semibold text-error-600 transition-colors hover:bg-error-50"
                >
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </div>

              {profile.skills.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">Compétences proposées</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {profile.skills.map((s) => (
                      <span key={s} className="rounded-full bg-white border border-gold-hairline px-3 py-1 text-[11px] font-semibold text-ink-base shadow-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {profile.needs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-3">Recherche</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {profile.needs.map((s) => (
                      <span key={s} className="rounded-full bg-paper-base border border-gold-hairline px-3 py-1 text-[11px] font-semibold text-ink-base shadow-sm">
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
            <div className="rounded-[30px] border border-white bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-ink-base mb-4">Informations complémentaires</h2>
              <div className="flex flex-col gap-4 text-sm text-ink-muted">
                {profile.intervention_zone && (
                  <div>
                    <span className="block text-xs text-patina-deep mb-1">Zone d'intervention</span>
                    <span className="font-medium text-ink-base">{profile.intervention_zone}</span>
                  </div>
                )}
                {profile.indicative_rates && (
                  <div>
                    <span className="block text-xs text-patina-deep mb-1">Tarifs indicatifs</span>
                    <span className="font-medium text-ink-base">{profile.indicative_rates}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <TrustPanel profile={profile} badges={badges} reviewCount={reviews.length} avgRating={avgRating} />

          {/* Mises en relation */}
          <div className="rounded-[30px] border border-white bg-white p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold text-ink-base">Mises en relation</h2>
            {connections.length === 0 ? (
              <div className="rounded-2xl bg-paper-base border border-gold-hairline p-8 text-center shadow-inner">
                <MessageCircle size={28} className="mx-auto text-patina-deep/50" />
                <p className="mt-3 text-sm text-ink-muted">Aucune mise en relation pour l'instant.</p>
                <button onClick={() => navigate('/annuaire')} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white border border-gold-hairline px-4 py-2 font-semibold text-ink-base shadow-sm transition-transform hover:-translate-y-0.5 mx-auto">
                  Explorer l'annuaire <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages/${c.id}`)}
                    className="flex w-full items-center gap-4 rounded-xl border border-gold-hairline bg-white/50 p-4 text-left hover:bg-paper-base hover:shadow-sm transition-all"
                  >
                    <Avatar name={c.other?.display_name ?? 'Inconnu'} src={c.other?.photo_url} size={44} className="border border-gold-hairline bg-paper-base text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="break-words text-[15px] font-semibold leading-tight text-ink-base">{c.other?.display_name ?? 'Membre'}</p>
                        <p className="mt-0.5 text-xs font-medium text-patina-deep shrink-0">{timeAgo(c.created_at)}</p>
                      </div>
                      {c.service_label && <p className="truncate text-[13px] text-ink-muted mt-1">{c.service_label}</p>}
                    </div>
                    <StatusBadge status={c.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avis reçus */}
          <div className="rounded-[30px] border border-white bg-white p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold text-ink-base">Avis reçus</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucun avis pour le moment.</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-gold-hairline pb-6 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <Avatar name={r.author?.display_name ?? 'Anonyme'} src={r.author?.photo_url} size={44} className="border border-gold-hairline bg-paper-base text-ink-muted" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-bold text-ink-base break-words pr-2">{r.author?.display_name ?? 'Anonyme'}</p>
                          <p className="text-[13px] font-medium text-patina-deep shrink-0">{timeAgo(r.created_at)}</p>
                        </div>
                        <div className="mt-0.5 text-[#D4AF37]">
                          <StarRating value={r.rating} size={13} />
                        </div>
                        {r.comment && <p className="mt-2.5 text-[15px] text-ink-base leading-relaxed">{r.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges obtenus */}
          <div className="rounded-[30px] border border-white bg-white p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold text-ink-base">Badges obtenus</h2>
            {badges.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucun badge obtenu.</p>
            ) : (
              <BadgeList badges={badges} className="gap-2" />
            )}
          </div>
        </div>
      </div>
      </div>
  );
}

function StatusBadge({ status }: { status: Connection['status'] }) {
  const map = {
    pending: { icon: Clock, label: 'En attente', cls: 'bg-warning-100 text-warning-700' },
    accepted: { icon: CheckCircle2, label: 'Acceptée', cls: 'bg-primary-100 text-primary-600' },
    completed: { icon: CheckCircle2, label: 'Terminée', cls: 'bg-success-100 text-success-700' },
    cancelled: { icon: XCircle, label: 'Annulée', cls: 'bg-neutral-100 text-neutral-500' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map.cls}`}>
      <map.icon size={12} /> {map.label}
    </span>
  );
}
