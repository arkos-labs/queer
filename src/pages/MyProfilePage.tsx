import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Profile, Badge, Review, Connection } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BadgeList } from '@/components/BadgeChip';
import { AverageStars } from '@/components/StarRating';
import { avg, formatDate, timeAgo } from '@/lib/utils';
import {
  Pencil,
  MapPin,
  Users,
  Briefcase,
  Building2,
  MessageCircle,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

interface ConnectionWithOther extends Connection {
  other?: Profile;
}

export function MyProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [connections, setConnections] = useState<ConnectionWithOther[]>([]);
  const [loading, setLoading] = useState(true);

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
        supabase.from('reviews').select('*').eq('target_id', user.id).order('created_at', { ascending: false }),
        supabase.from('connections').select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setBadges(((pbRes.data ?? []) as unknown as { badge: Badge }[]).map((x) => x.badge).filter(Boolean));
      setReviews((revRes.data ?? []) as Review[]);
      const conns = (connRes.data ?? []) as Connection[];
      const otherIds = Array.from(new Set(conns.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))));
      let otherMap = new Map<string, Profile>();
      if (otherIds.length > 0) {
        const { data: others } = await supabase.from('profiles').select('*').in('id', otherIds);
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
    pro: { icon: Briefcase, label: 'Professionnel·le' },
    asso: { icon: Building2, label: 'Association / structure' },
  }[profile.account_type];

  return (
    <div className="animate-fade-in">
      <div className="h-32 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 sm:h-40" />

      <div className="container-app">
        <div className="-mt-20 grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="card p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={profile.display_name} src={profile.photo_url} size={88} className="ring-4 ring-white" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h1 className="font-display text-2xl font-semibold text-neutral-900">{profile.display_name}</h1>
                    <button onClick={() => navigate('/profil/modifier')} className="btn-outline btn-sm">
                      <Pencil size={14} /> Modifier
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                    <span className="inline-flex items-center gap-1.5">
                      <typeMeta.icon size={14} /> {typeMeta.label}
                    </span>
                    {profile.civilite && <span>· {profile.civilite}</span>}
                    {profile.pronouns && <span>· {profile.pronouns}</span>}
                    {profile.city && (
                      <span className="inline-flex items-center gap-1.5">
                        · <MapPin size={14} /> {profile.city}
                      </span>
                    )}
                  </div>
                  {reviews.length > 0 && (
                    <div className="mt-3">
                      <AverageStars value={avgRating} count={reviews.length} />
                    </div>
                  )}
                </div>
              </div>

              {profile.bio && <p className="mt-6 whitespace-pre-line text-neutral-700">{profile.bio}</p>}

              {profile.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Compétences proposées</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <span key={s} className="rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.needs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Recherche</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.needs.map((s) => (
                      <span key={s} className="rounded-full bg-secondary-50 px-3 py-1.5 text-sm font-medium text-secondary-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {badges.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Badges</h3>
                  <div className="mt-3"><BadgeList badges={badges} /></div>
                </div>
              )}
            </div>

            {/* Reviews received */}
            <div className="card mt-6 p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold text-neutral-900">Avis reçus</h2>
              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">Aucun avis pour le moment.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-neutral-100 pb-5 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-400">{timeAgo(r.created_at)}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className={i < r.rating ? 'fill-accent-400 text-accent-400' : 'fill-neutral-200 text-neutral-300'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-neutral-700">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-neutral-900">Mes mises en relation</h3>
              <p className="mt-1 text-sm text-neutral-500">Vos échanges en cours avec la communauté.</p>

              {connections.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-neutral-50 p-6 text-center">
                  <MessageCircle size={28} className="mx-auto text-neutral-300" />
                  <p className="mt-3 text-sm text-neutral-500">Aucune mise en relation pour l'instant.</p>
                  <button onClick={() => navigate('/annuaire')} className="btn-outline btn-sm mt-4">
                    Explorer l'annuaire <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {connections.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3">
                      <Avatar name={c.other?.display_name ?? 'Inconnu'} src={c.other?.photo_url} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{c.other?.display_name ?? 'Membre'}</p>
                        {c.service_label && <p className="truncate text-xs text-neutral-500">{c.service_label}</p>}
                        <p className="mt-0.5 text-xs text-neutral-400">{timeAgo(c.created_at)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card mt-6 p-6">
              <h3 className="font-display text-lg font-semibold text-neutral-900">Compte</h3>
              <p className="mt-1 text-xs text-neutral-400">Membre depuis le {formatDate(profile.created_at)}</p>
              <button onClick={() => navigate('/parametres')} className="btn-ghost mt-4 w-full justify-start">
                Paramètres & confidentialité
              </button>
            </div>
          </div>
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
