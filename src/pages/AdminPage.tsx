import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Profile, Report, Category, Place, PlaceReview, Badge } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { cn, timeAgo } from '@/lib/utils';
import {
  Shield,
  ShieldCheck,
  Users,
  Flag,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Plus,
  MapPin,
  AlertTriangle,
  Eye,
  Ban,
} from 'lucide-react';

type Tab = 'profiles' | 'reports' | 'categories' | 'places';

export function AdminPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('profiles');

  if (!user) {
    navigate('/connexion');
    return null;
  }
  if (profile && !profile.is_admin) {
    return (
      <div className="container-app py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Shield size={26} />
        </div>
        <h2 className="font-display text-2xl font-semibold text-neutral-900">Accès réservé</h2>
        <p className="mt-2 text-sm text-neutral-500">Cette section est réservée aux administrateurs.</p>
        <button onClick={() => navigate('/annuaire')} className="btn-primary mt-6">Retour à l'annuaire</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-soft">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-neutral-900">Back-office</h1>
              <p className="text-sm text-neutral-500">Administration et modération de la communauté.</p>
            </div>
          </div>

          <div className="mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-neutral-100 p-1 ring-1 ring-neutral-200">
            {([
              { id: 'profiles' as Tab, label: 'Profils', icon: Users },
              { id: 'places' as Tab, label: 'Lieux', icon: MapPin },
              { id: 'reports' as Tab, label: 'Signalements', icon: Flag },
              { id: 'categories' as Tab, label: 'Catégories', icon: LayoutGrid },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                  tab === t.id
                    ? 'bg-white text-primary-600 shadow-soft ring-1 ring-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-app py-8">
        {tab === 'profiles' && <ProfilesTab />}
        {tab === 'places' && <PlacesTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
}

function ProfilesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'suspended' | 'banned'>('all');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [profileBadges, setProfileBadges] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [profRes, badgeRes, pbRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('badges').select('*').order('label'),
        supabase.from('profile_badges').select('profile_id, badge_id'),
      ]);
      if (!cancelled) {
        setProfiles((profRes.data ?? []) as Profile[]);
        setBadges((badgeRes.data ?? []) as Badge[]);
        const byProfile: Record<string, Set<string>> = {};
        for (const row of (pbRes.data ?? []) as { profile_id: string; badge_id: string }[]) {
          if (!byProfile[row.profile_id]) byProfile[row.profile_id] = new Set();
          byProfile[row.profile_id].add(row.badge_id);
        }
        setProfileBadges(byProfile);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const toggleBadge = async (profileId: string, badgeId: string) => {
    const has = profileBadges[profileId]?.has(badgeId);
    if (has) {
      const { error } = await supabase.from('profile_badges').delete().eq('profile_id', profileId).eq('badge_id', badgeId);
      if (error) return;
      setProfileBadges((prev) => {
        const next = new Set(prev[profileId]);
        next.delete(badgeId);
        return { ...prev, [profileId]: next };
      });
    } else {
      const { error } = await supabase.from('profile_badges').insert({ profile_id: profileId, badge_id: badgeId, source_rule: 'admin' });
      if (error) return;
      setProfileBadges((prev) => {
        const next = new Set(prev[profileId]);
        next.add(badgeId);
        return { ...prev, [profileId]: next };
      });
    }
  };

  const updateStatus = async (id: string, status: Profile['profile_status']) => {
    const { error } = await supabase.from('profiles').update({ profile_status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, profile_status: status } : p)));
  };

  const toggleVerification = async (p: Profile) => {
    const nowVerified = p.verification_status === 'verified';
    const patch = nowVerified
      ? { verification_status: 'none' as const, verified_at: null }
      : { verification_status: 'verified' as const, verified_at: new Date().toISOString() };
    const { error } = await supabase.from('profiles').update(patch).eq('id', p.id);
    if (!error) setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  };

  const rejectVerification = async (p: Profile) => {
    const patch = { verification_status: 'rejected' as const, verified_at: null };
    const { error } = await supabase.from('profiles').update(patch).eq('id', p.id);
    if (!error) setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  };

  const viewIdentityDocument = async (p: Profile) => {
    if (!p.identity_document_path) return;
    const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(p.identity_document_path, 120);
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const filtered = filter === 'all' ? profiles : profiles.filter((p) => p.profile_status === filter);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['all', 'pending', 'suspended', 'banned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              filter === f ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
            )}
          >
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'suspended' ? 'Suspendus' : 'Bannis'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-neutral-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-neutral-500">Aucun profil dans cette catégorie.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center gap-4">
                <Avatar name={p.display_name} src={p.photo_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900">{p.display_name}</p>
                  <p className="truncate text-xs text-neutral-500">{p.email} · {p.account_type} · {p.city ?? '—'}</p>
                </div>
                {p.verification_status === 'verified' && (
                  <span className="hidden items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 ring-1 ring-primary-200 sm:inline-flex">
                    <ShieldCheck size={12} /> Vérifié
                  </span>
                )}
                {p.verification_status === 'pending' && (
                  <span className="hidden items-center gap-1 rounded-full bg-warning-100 px-2.5 py-1 text-xs font-medium text-warning-700 sm:inline-flex">
                    <Clock size={12} /> Pièce à vérifier
                  </span>
                )}
                <span className={cn(
                  'hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block',
                  p.profile_status === 'active' && 'bg-success-100 text-success-700',
                  p.profile_status === 'pending' && 'bg-warning-100 text-warning-700',
                  p.profile_status === 'suspended' && 'bg-neutral-200 text-neutral-900',
                  p.profile_status === 'banned' && 'bg-error-100 text-error-700',
                )}>
                  {p.profile_status}
                </span>
                <div className="flex gap-1">
                  {p.identity_document_path && (
                    <button
                      onClick={() => viewIdentityDocument(p)}
                      className="btn-ghost btn-sm text-neutral-500 hover:bg-neutral-100"
                      title="Voir la pièce d'identité envoyée"
                      aria-label={`Voir la pièce d'identité de ${p.display_name}`}
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => toggleVerification(p)}
                    className={cn(
                      'btn-ghost btn-sm',
                      p.verification_status === 'verified' ? 'text-primary-600 hover:bg-primary-50' : 'text-neutral-400 hover:bg-neutral-100',
                    )}
                    title={p.verification_status === 'verified' ? "Retirer la vérification d'identité" : "Vérifier l'identité"}
                    aria-label={p.verification_status === 'verified' ? `Retirer la vérification d'identité de ${p.display_name}` : `Vérifier l'identité de ${p.display_name}`}
                  >
                    <ShieldCheck size={16} />
                  </button>
                  {p.verification_status === 'pending' && (
                    <button
                      onClick={() => rejectVerification(p)}
                      className="btn-ghost btn-sm text-error-600 hover:bg-error-50"
                      title="Refuser la pièce d'identité"
                      aria-label={`Refuser la pièce d'identité de ${p.display_name}`}
                    >
                      <Ban size={16} />
                    </button>
                  )}
                  {p.profile_status !== 'active' && (
                    <button onClick={() => updateStatus(p.id, 'active')} className="btn-ghost btn-sm text-success-600 hover:bg-success-50" title="Activer" aria-label={`Activer le profil de ${p.display_name}`}>
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  {p.profile_status !== 'suspended' && (
                    <button onClick={() => updateStatus(p.id, 'suspended')} className="btn-ghost btn-sm text-warning-600 hover:bg-warning-50" title="Suspendre" aria-label={`Suspendre le profil de ${p.display_name}`}>
                      <Clock size={16} />
                    </button>
                  )}
                  {p.profile_status !== 'banned' && (
                    <button onClick={() => updateStatus(p.id, 'banned')} className="btn-ghost btn-sm text-error-600 hover:bg-error-50" title="Bannir" aria-label={`Bannir le profil de ${p.display_name}`}>
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
              {badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-200 pt-3">
                  {badges.map((b) => {
                    const active = profileBadges[p.id]?.has(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => toggleBadge(p.id, b.id)}
                        title={b.description ?? b.label}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                          active
                            ? 'border-primary-300 bg-primary-50 text-primary-600'
                            : 'border-neutral-200 text-neutral-500 hover:border-neutral-200',
                        )}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PlaceWithJoins extends Omit<Place, 'submitter' | 'subcategory'> {
  submitter?: Pick<Profile, 'display_name'>;
  subcategory?: { label: string };
}
interface PlaceReviewWithJoins extends Omit<PlaceReview, 'author' | 'place'> {
  author?: Pick<Profile, 'display_name'>;
  place?: { name: string };
}

function PlacesTab() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<'places' | 'reviews'>('places');
  const [places, setPlaces] = useState<PlaceWithJoins[]>([]);
  const [placeReviews, setPlaceReviews] = useState<PlaceReviewWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [placesRes, reviewsRes] = await Promise.all([
        supabase
          .from('places')
          .select('*, submitter:profiles!places_submitted_by_fkey(display_name), subcategory:subcategories(label)')
          .order('created_at', { ascending: false }),
        supabase
          .from('place_reviews')
          .select('*, author:profiles!place_reviews_author_id_fkey(display_name), place:places(name)')
          .order('created_at', { ascending: false }),
      ]);
      if (!cancelled) {
        setPlaces((placesRes.data ?? []) as PlaceWithJoins[]);
        setPlaceReviews((reviewsRes.data ?? []) as PlaceReviewWithJoins[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const decidePlace = async (p: PlaceWithJoins, status: 'approved' | 'rejected') => {
    let rejection_reason: string | null = null;
    if (status === 'rejected') {
      rejection_reason = window.prompt('Motif du rejet (facultatif) :', p.rejection_reason ?? '') ?? '';
      if (rejection_reason === '') rejection_reason = null;
    }
    const patch = { status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), rejection_reason };
    const { error } = await supabase.from('places').update(patch).eq('id', p.id);
    if (!error) setPlaces((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  };

  const decideReview = async (r: PlaceReviewWithJoins, status: 'approved' | 'rejected') => {
    let rejection_reason: string | null = null;
    if (status === 'rejected') {
      rejection_reason = window.prompt('Motif du rejet (facultatif) :', r.rejection_reason ?? '') ?? '';
      if (rejection_reason === '') rejection_reason = null;
    }
    const patch = { status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), rejection_reason };
    const { error } = await supabase.from('place_reviews').update(patch).eq('id', r.id);
    if (!error) setPlaceReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
  };

  const filteredPlaces = filter === 'all' ? places : places.filter((p) => p.status === filter);
  const filteredReviews = filter === 'all' ? placeReviews : placeReviews.filter((r) => r.status === filter);

  const statusPill = (status: string) => (
    <span className={cn(
      'rounded-full px-2.5 py-1 text-xs font-medium',
      status === 'approved' && 'bg-success-100 text-success-700',
      status === 'pending' && 'bg-warning-100 text-warning-700',
      status === 'rejected' && 'bg-error-100 text-error-700',
    )}>
      {status === 'approved' ? 'Approuvé' : status === 'pending' ? 'En attente' : 'Rejeté'}
    </span>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(['places', 'reviews'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                subTab === t ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
              )}
            >
              {t === 'places' ? `Lieux (${places.length})` : `Avis sur les lieux (${placeReviews.length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                filter === f ? 'bg-primary-600 text-white shadow-soft' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
              )}
            >
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Rejetés'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-neutral-100" />)}
        </div>
      ) : subTab === 'places' ? (
        filteredPlaces.length === 0 ? (
          <div className="card p-10 text-center text-sm text-neutral-500">Aucun lieu dans cette catégorie.</div>
        ) : (
          <div className="space-y-3">
            {filteredPlaces.map((p) => (
              <div key={p.id} className="card flex items-start gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400"><MapPin size={20} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900">{p.name}</p>
                    {p.flagged && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-error-50 px-2 py-0.5 text-[11px] font-medium text-error-700" title="Signalé par le filtre automatique">
                        <AlertTriangle size={10} /> Filtré
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-500">
                    {p.subcategory?.label ?? '—'} · {[p.address, p.city].filter(Boolean).join(', ') || '—'} · proposé par {p.submitter?.display_name ?? '—'}
                  </p>
                  {p.rejection_reason && <p className="mt-1 text-xs text-neutral-400 italic">Motif : {p.rejection_reason}</p>}
                </div>
                {statusPill(p.status)}
                <div className="flex gap-1">
                  {p.status !== 'approved' && (
                    <button onClick={() => decidePlace(p, 'approved')} className="btn-ghost btn-sm text-success-600 hover:bg-success-50" title="Approuver" aria-label={`Approuver le lieu ${p.name}`}>
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  {p.status !== 'rejected' && (
                    <button onClick={() => decidePlace(p, 'rejected')} className="btn-ghost btn-sm text-error-600 hover:bg-error-50" title="Rejeter" aria-label={`Rejeter le lieu ${p.name}`}>
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredReviews.length === 0 ? (
        <div className="card p-10 text-center text-sm text-neutral-500">Aucun avis dans cette catégorie.</div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => (
            <div key={r.id} className="card flex items-start gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-neutral-900">{r.place?.name ?? '—'}</p>
                  <StarRating value={r.rating} size={12} />
                  {r.flagged && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error-50 px-2 py-0.5 text-[11px] font-medium text-error-700" title="Signalé par le filtre automatique">
                      <AlertTriangle size={10} /> Filtré
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-neutral-500">par {r.author?.display_name ?? '—'} · {timeAgo(r.created_at)}</p>
                {r.comment && <p className="mt-1 text-sm text-neutral-500">{r.comment}</p>}
                {r.rejection_reason && <p className="mt-1 text-xs text-neutral-400 italic">Motif : {r.rejection_reason}</p>}
              </div>
              {statusPill(r.status)}
              <div className="flex gap-1">
                {r.status !== 'approved' && (
                  <button onClick={() => decideReview(r, 'approved')} className="btn-ghost btn-sm text-success-600 hover:bg-success-50" title="Approuver" aria-label="Approuver cet avis">
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => decideReview(r, 'rejected')} className="btn-ghost btn-sm text-error-600 hover:bg-error-50" title="Rejeter" aria-label="Rejeter cet avis">
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<(Report & { reporter?: Pick<Profile, 'display_name'> })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(display_name)')
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setReports((data ?? []) as (Report & { reporter?: Pick<Profile, 'display_name'> })[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const updateStatus = async (id: string, status: Report['status']) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (!error) setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  if (loading) return <div className="card h-64 animate-pulse bg-neutral-100" />;

  if (reports.length === 0) return <div className="card p-10 text-center text-sm text-neutral-500">Aucun signalement. Tout va bien !</div>;

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  r.status === 'open' && 'bg-error-100 text-error-700',
                  r.status === 'reviewing' && 'bg-warning-100 text-warning-700',
                  r.status === 'resolved' && 'bg-success-100 text-success-700',
                  r.status === 'dismissed' && 'bg-neutral-100 text-neutral-500',
                )}>
                  {r.status === 'open' ? 'Ouvert' : r.status === 'reviewing' ? 'En cours' : r.status === 'resolved' ? 'Résolu' : 'Écarté'}
                </span>
                <span className="text-xs text-neutral-400">par {r.reporter?.display_name ?? 'Inconnu'} · {timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-900">
                <span className="font-medium">{r.target_type === 'profile' ? 'Profil' : r.target_type === 'review' ? 'Avis' : 'Message'} :</span>{' '}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{r.target_id.slice(0, 8)}</code>
              </p>
              <p className="mt-2 text-sm text-neutral-500">{r.reason}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {r.status !== 'resolved' && (
                <button onClick={() => updateStatus(r.id, 'resolved')} className="btn-ghost btn-sm text-success-600 hover:bg-success-50" title="Résoudre" aria-label="Marquer ce signalement comme résolu">
                  <CheckCircle2 size={16} />
                </button>
              )}
              {r.status !== 'dismissed' && (
                <button onClick={() => updateStatus(r.id, 'dismissed')} className="btn-ghost btn-sm text-neutral-500 hover:bg-neutral-100" title="Écarter" aria-label="Écarter ce signalement">
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      if (!cancelled) {
        setCategories((data ?? []) as Category[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const addCategory = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const slug = slugify(newLabel);
    const { data, error } = await supabase.from('categories').insert({
      label: newLabel.trim(),
      slug,
      sort_order: categories.length + 1,
    }).select().single();
    setAdding(false);
    if (!error && data) {
      setCategories((prev) => [...prev, data as Category]);
      setNewLabel('');
    }
  };

  const removeCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) return <div className="card h-64 animate-pulse bg-neutral-100" />;

  return (
    <div>
      <div className="card mb-6 p-5">
        <h3 className="font-display text-lg font-semibold text-neutral-900">Ajouter une catégorie</h3>
        <div className="mt-3 flex gap-2">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="input" placeholder="Ex. Nouvelle catégorie" />
          <button onClick={addCategory} disabled={adding || !newLabel.trim()} className="btn-primary shrink-0">
            <Plus size={16} /> {adding ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="card flex items-center gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <LayoutGrid size={16} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{c.label}</p>
              <p className="text-xs text-neutral-400">{c.slug}</p>
            </div>
            <button onClick={() => removeCategory(c.id)} className="btn-ghost btn-sm text-error-600 hover:bg-error-50" title="Supprimer" aria-label={`Supprimer la catégorie ${c.label}`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
