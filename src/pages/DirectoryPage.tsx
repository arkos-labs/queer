import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Category, Subcategory, Profile, Badge } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { AverageStars } from '@/components/StarRating';
import { cn } from '@/lib/utils';
import { getCategoryColor, RAINBOW_GRADIENT } from '@/lib/colors';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Users,
  Briefcase,
  Building2,
  ChevronRight,
  Check,
  Sparkles,
  ShieldCheck,
  Accessibility,
  BadgeCheck,
} from 'lucide-react';

interface DirectoryProfile extends Profile {
  badges?: Badge[];
  avg_rating?: number;
  review_count?: number;
  subcategory_ids?: string[];
}

const ICONS: Record<string, typeof Search> = {
  Wrench: Search,
  HeartPulse: Search,
  Scale: Search,
  Scissors: Search,
  GraduationCap: Search,
  PawPrint: Search,
  Car: Search,
  Users: Search,
};

const BADGE_ICONS: Record<string, typeof ShieldCheck> = {
  ShieldCheck,
  BadgeCheck,
  Accessibility,
  Sparkles,
};

export function DirectoryPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [accountType, setAccountType] = useState<string | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlySafe, setOnlySafe] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [catRes, subRes, profRes, pbRes, revRes, pscRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
        supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .eq('profile_status', 'active')
          .order('created_at', { ascending: false }),
        supabase.from('profile_badges').select('profile_id, badge:badges(*)'),
        supabase.from('reviews').select('target_id, rating'),
        supabase.from('profile_subcategories').select('profile_id, subcategory_id'),
      ]);

      if (cancelled) return;

      const cats = catRes.data as Category[];
      const subs = subRes.data as Subcategory[];
      const profs = profRes.data as Profile[];
      const pbs = (pbRes.data ?? []) as unknown as { profile_id: string; badge: Badge }[];
      const revs = (revRes.data ?? []) as { target_id: string; rating: number }[];
      const pscs = (pscRes.data ?? []) as { profile_id: string; subcategory_id: string }[];

      const ratingMap = new Map<string, { sum: number; count: number }>();
      for (const r of revs) {
        const cur = ratingMap.get(r.target_id) ?? { sum: 0, count: 0 };
        cur.sum += r.rating;
        cur.count += 1;
        ratingMap.set(r.target_id, cur);
      }

      const badgeMap = new Map<string, Badge[]>();
      for (const pb of pbs) {
        const arr = badgeMap.get(pb.profile_id) ?? [];
        if (pb.badge) arr.push(pb.badge);
        badgeMap.set(pb.profile_id, arr);
      }

      const pscMap = new Map<string, Set<string>>();
      for (const psc of pscs) {
        const set = pscMap.get(psc.profile_id) ?? new Set<string>();
        set.add(psc.subcategory_id);
        pscMap.set(psc.profile_id, set);
      }

      const enriched: DirectoryProfile[] = profs.map((p) => {
        const r = ratingMap.get(p.id);
        const bs = badgeMap.get(p.id) ?? [];
        return {
          ...p,
          badges: bs,
          avg_rating: r ? r.sum / r.count : 0,
          review_count: r?.count ?? 0,
          subcategory_ids: Array.from(pscMap.get(p.id) ?? []),
        };
      });

      setCategories(cats);
      setSubcategories(subs);
      setProfiles(enriched);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const filtered = useMemo(() => {
    let list = [...profiles];
    if (activeCategory) {
      const subIds = new Set(
        subcategories.filter((s) => s.category_id === activeCategory).map((s) => s.id),
      );
      list = list.filter((p) => (p.subcategory_ids ?? []).some((sid) => subIds.has(sid)));
    }
    if (activeSub) {
      const sub = subcategories.find((s) => s.id === activeSub);
      if (sub) list = list.filter((p) => (p.subcategory_ids ?? []).includes(sub.id));
    }
    if (city.trim()) {
      const q = city.toLowerCase().trim();
      list = list.filter((p) => p.city?.toLowerCase().includes(q));
    }
    if (accountType) list = list.filter((p) => p.account_type === accountType);
    if (onlyVerified) list = list.filter((p) => p.verification_status === 'verified');
    if (onlySafe) list = list.filter((p) => p.badges?.some((b) => b.code === 'safe'));
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          p.bio?.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [profiles, activeCategory, activeSub, city, accountType, onlyVerified, onlySafe, search, subcategories]);

  const activeCat = categories.find((c) => c.id === activeCategory);
  const subsForActive = subcategories.filter((s) => s.category_id === activeCategory);
  const activeCatColor = activeCat ? getCategoryColor(activeCat.slug) : null;

  const resetFilters = () => {
    setActiveCategory(null);
    setActiveSub(null);
    setCity('');
    setAccountType(null);
    setOnlyVerified(false);
    setOnlySafe(false);
    setSearch('');
  };

  const hasActiveFilters = activeCategory || activeSub || city || accountType || onlyVerified || onlySafe || search;

  return (
    <div className="animate-fade-in min-h-full bg-neutral-50">
      {/* Search header */}
      <div className="sticky top-14 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-lg">
        <div className="container-app py-4">
          <h1 className="font-display text-2xl font-semibold text-neutral-900">Annuaire</h1>

          {/* Search bar with rainbow underline */}
          <div className="relative mt-3">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11 pr-10"
              placeholder="Nom, compétence, service…"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
              >
                <X size={16} />
              </button>
            )}
            <div className="mt-1.5 h-1 w-full rounded-full" style={{ background: RAINBOW_GRADIENT }} />
          </div>

          {/* Filter toggle */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              {hasActiveFilters && ' · filtré'}
            </p>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                showFilters ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600',
              )}
            >
              <SlidersHorizontal size={13} /> Filtres
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-3 space-y-3 rounded-2xl bg-neutral-50 p-4">
              <div>
                <label className="label">Ville</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="input pl-9" placeholder="Ex. Lyon" />
                </div>
              </div>
              <div>
                <label className="label">Type de compte</label>
                <select
                  value={accountType ?? ''}
                  onChange={(e) => setAccountType(e.target.value || null)}
                  className="input"
                >
                  <option value="">Tous</option>
                  <option value="particulier">Particulier·e</option>
                  <option value="pro">Professionnel·le</option>
                  <option value="asso">Association</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  Identité vérifiée
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={onlySafe}
                    onChange={(e) => setOnlySafe(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  Badge Safe
                </label>
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="btn-ghost btn-sm w-full">
                  <X size={14} /> Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rainbow arc — themes */}
      <div className="container-app py-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Thèmes
        </p>

        {/* Arc bands */}
        <div className="space-y-2.5">
          {/* "Tout" band */}
          <button
            onClick={() => {
              setActiveCategory(null);
              setActiveSub(null);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition active:scale-[0.98]',
              !activeCategory
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-700 shadow-soft',
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: RAINBOW_GRADIENT }}
              >
                <Sparkles size={16} className="text-white" />
              </span>
              <span className="font-display text-sm font-semibold">Tous les thèmes</span>
            </span>
            {!activeCategory && <Check size={18} />}
          </button>

          {categories.map((c) => {
            const color = getCategoryColor(c.slug);
            const Icon = ICONS[c.icon ?? ''] ?? Search;
            const isActive = activeCategory === c.id;
            return (
              <div key={c.id}>
                <button
                  onClick={() => {
                    setActiveCategory(isActive ? null : c.id);
                    setActiveSub(null);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition active:scale-[0.98]',
                    isActive ? 'text-white shadow-md' : 'bg-white text-neutral-700 shadow-soft',
                  )}
                  style={
                    isActive
                      ? { background: `linear-gradient(135deg, ${color.from}, ${color.to})` }
                      : undefined
                  }
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : color.solid + '15',
                      }}
                    >
                      <Icon size={16} style={{ color: isActive ? '#fff' : color.solid }} />
                    </span>
                    <span className="font-display text-sm font-semibold">{c.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {isActive && <Check size={18} />}
                    <ChevronRight
                      size={18}
                      className={cn('transition', isActive ? 'rotate-90' : 'text-neutral-400')}
                    />
                  </div>
                </button>

                {/* Sub-themes — revealed under the active band */}
                {isActive && subsForActive.length > 0 && (
                  <div
                    className="mt-1.5 ml-3 mr-3 space-y-1.5 rounded-2xl p-3"
                    style={{ background: color.solid + '08' }}
                  >
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: color.solid }}>
                      Sous-thèmes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {subsForActive.map((s) => {
                        const subActive = activeSub === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActiveSub(subActive ? null : s.id)}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95',
                              subActive
                                ? 'text-white'
                                : 'bg-white text-neutral-600 hover:bg-neutral-50',
                            )}
                            style={subActive ? { background: color.solid } : undefined}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rainbow divider */}
        <div className="my-6 h-1 w-full rounded-full" style={{ background: RAINBOW_GRADIENT }} />
      </div>

      {/* Results */}
      <div className="container-app pb-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-32 animate-pulse bg-neutral-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
              <Search size={26} />
            </div>
            <h3 className="font-display text-lg font-semibold text-neutral-900">Aucun résultat</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Essayez d'élargir vos filtres ou de réinitialiser la recherche.
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="btn-outline mt-5">
                Réinitialiser
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const pCats = categories.filter((c) =>
                subcategories
                  .filter((s) => (p.subcategory_ids ?? []).includes(s.id))
                  .some((s) => s.category_id === c.id),
              );
              const primaryColor = pCats[0] ? getCategoryColor(pCats[0].slug) : null;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/profil/${p.id}`)}
                  className="card group flex w-full items-start gap-3 p-4 text-left transition active:scale-[0.98]"
                >
                  <Avatar name={p.display_name} src={p.photo_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-semibold text-neutral-900">
                      {p.display_name}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        {p.account_type === 'particulier' && <Users size={11} />}
                        {p.account_type === 'pro' && <Briefcase size={11} />}
                        {p.account_type === 'asso' && <Building2 size={11} />}
                        {p.account_type === 'particulier'
                          ? 'Particulier·e'
                          : p.account_type === 'pro'
                            ? 'Professionnel·le'
                            : 'Association'}
                      </span>
                      {p.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} /> {p.city}
                        </span>
                      )}
                    </div>
                    {p.avg_rating !== undefined && p.avg_rating > 0 && (
                      <div className="mt-1.5">
                        <AverageStars value={p.avg_rating} count={p.review_count ?? 0} size={13} />
                      </div>
                    )}
                    {p.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                          >
                            {s}
                          </span>
                        ))}
                        {p.skills.length > 3 && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-400">
                            +{p.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {p.badges && p.badges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.badges.map((b) => {
                          const BIcon = BADGE_ICONS[b.icon ?? ''] ?? ShieldCheck;
                          return (
                            <span
                              key={b.id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                            >
                              <BIcon size={11} /> {b.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {primaryColor && (
                    <span
                      className="mt-1 h-8 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: primaryColor.solid }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
