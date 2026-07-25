import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Category, Subcategory, Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { avg } from '@/lib/utils';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import {
  Search,
  X,
  Star,
  MapPin,
  Home,
  HeartPulse,
  ShoppingBag,
  Handshake,
  Users,
  Sparkles,
  LayoutGrid,
  ShieldCheck,
  Briefcase,
  Building2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Home> = {
  Home,
  HeartPulse,
  Briefcase,
  ShoppingBag,
  Handshake,
  Users,
};

interface ProfileWithStats extends Profile {
  subIds: Set<string>;
  avgRating: number;
  reviewCount: number;
}

const typeMeta: Record<Profile['account_type'], { icon: typeof Users; label: string }> = {
  particulier: { icon: Users, label: 'Particulier·e' },
  pro: { icon: Briefcase, label: 'Professionnel·le' },
  asso: { icon: Building2, label: 'Association' },
};

export function DirectoryPage() {
  const { navigate } = useRouter();
  const { user, profile: myProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [showSubBar, setShowSubBar] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      // Categories/subcategories are static reference data: if the request
      // fails (no Supabase project connected yet, offline…) fall back to
      // the local taxonomy copy so the theme tabs are always usable.
      try {
        const [catRes, subRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('subcategories').select('*').order('sort_order'),
        ]);
        if (cancelled) return;
        if (catRes.error || subRes.error || !catRes.data?.length) {
          setCategories(FALLBACK_CATEGORIES);
          setSubcategories(FALLBACK_SUBCATEGORIES);
        } else {
          setCategories(catRes.data as Category[]);
          setSubcategories((subRes.data ?? []) as Subcategory[]);
        }
      } catch {
        if (cancelled) return;
        setCategories(FALLBACK_CATEGORIES);
        setSubcategories(FALLBACK_SUBCATEGORIES);
      }

      // Real member data can't be faked — surface a real error if this fails.
      try {
        const profRes = await supabase
          .from('profiles')
          .select('*')
          .eq('profile_status', 'active')
          .order('created_at', { ascending: false });
        if (cancelled) return;

        if (profRes.error) {
          setError(profRes.error.message);
          setProfiles([]);
          setLoading(false);
          return;
        }

        const allProfiles = (profRes.data ?? []) as Profile[];
        const ids = allProfiles.map((p) => p.id);

        const [pscRes, revRes] = await Promise.all([
          ids.length
            ? supabase.from('profile_subcategories').select('profile_id, subcategory_id').in('profile_id', ids)
            : Promise.resolve({ data: [], error: null }),
          ids.length
            ? supabase.from('reviews').select('target_id, rating').in('target_id', ids)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (cancelled) return;

        const subsByProfile = new Map<string, Set<string>>();
        for (const row of (pscRes.data ?? []) as { profile_id: string; subcategory_id: string }[]) {
          if (!subsByProfile.has(row.profile_id)) subsByProfile.set(row.profile_id, new Set());
          subsByProfile.get(row.profile_id)!.add(row.subcategory_id);
        }

        const ratingsByProfile = new Map<string, number[]>();
        for (const row of (revRes.data ?? []) as { target_id: string; rating: number }[]) {
          if (!ratingsByProfile.has(row.target_id)) ratingsByProfile.set(row.target_id, []);
          ratingsByProfile.get(row.target_id)!.push(row.rating);
        }

        const withStats: ProfileWithStats[] = allProfiles.map((p) => {
          const ratings = ratingsByProfile.get(p.id) ?? [];
          return {
            ...p,
            subIds: subsByProfile.get(p.id) ?? new Set(),
            avgRating: avg(ratings),
            reviewCount: ratings.length,
          };
        });

        setProfiles(withStats);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Impossible de charger les membres.');
        setProfiles([]);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const activeCatDef = categories.find((c) => c.id === activeCategory);
  const subsForActiveCat = subcategories.filter((s) => s.category_id === activeCategory);
  const subcategoryById = useMemo(() => new Map(subcategories.map((s) => [s.id, s])), [subcategories]);

  const filtered = useMemo(() => {
    let list = profiles.filter((p) => p.id !== myProfile?.id);

    if (activeCategory) {
      const subIdsInCat = new Set(subcategories.filter((s) => s.category_id === activeCategory).map((s) => s.id));
      list = list.filter((p) => Array.from(p.subIds).some((id) => subIdsInCat.has(id)));
    }

    if (activeSub) {
      list = list.filter((p) => p.subIds.has(activeSub));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q) ||
          (p.bio ?? '').toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q)) ||
          Array.from(p.subIds).some((id) => subcategoryById.get(id)?.label.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [profiles, activeCategory, activeSub, search, subcategories, subcategoryById, myProfile]);

  if (!user) return null;

  return (
    <div className="min-h-full bg-white animate-fade-in">
      {/* Sticky header */}
      <div className="sticky top-20 z-40 bg-white border-b border-neutral-100 shadow-sm">
        <div className="px-5 pt-0 pb-3">
          <div className="relative">
            <Search size={20} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-900" />
            <label htmlFor="directory-search" className="sr-only">
              Rechercher un membre, une compétence, une ville
            </label>
            <input
              id="directory-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Montage cuisine, ménage, pet-sitting…"
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-3.5 pl-12 pr-12 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 transition-all shadow-soft"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Effacer la recherche"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex overflow-x-auto gap-6 px-6 pb-2 snap-x no-scrollbar scroll-smooth">
          <button
            onClick={() => {
              setActiveCategory(null);
              setActiveSub(null);
              setShowSubBar(false);
            }}
            className={`flex flex-col items-center gap-2 min-w-fit snap-start pb-2 border-b-2 transition-colors ${
              !activeCategory ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
            }`}
          >
            <Sparkles size={24} strokeWidth={!activeCategory ? 2.5 : 2} />
            <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap">Tout</span>
          </button>

          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.icon ?? ''] ?? LayoutGrid;
            const isActive = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (isActive) {
                    setActiveCategory(null);
                    setActiveSub(null);
                    setShowSubBar(false);
                  } else {
                    setActiveCategory(c.id);
                    setActiveSub(null);
                    setShowSubBar(true);
                  }
                }}
                className={`flex flex-col items-center gap-2 min-w-fit snap-start pb-2 border-b-2 transition-colors ${
                  isActive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="transition-transform active:scale-95" />
                <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap">{c.label}</span>
              </button>
            );
          })}
        </div>

        {activeCategory && activeCatDef && subsForActiveCat.length > 0 && (
          <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-2.5 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveSub(null)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                !activeSub ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
              }`}
            >
              Tout {activeCatDef.label}
            </button>
            {subsForActiveCat.map((sub) => {
              const isSubActive = activeSub === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveSub(isSubActive ? null : sub.id)}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    isSubActive ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {!loading && (
            <>
              <span className="font-semibold text-neutral-900">{filtered.length}</span>{' '}
              membre{filtered.length > 1 ? 's' : ''}
              {activeCategory && activeCatDef && (
                <span>
                  {' '}
                  en <span className="font-semibold text-neutral-900">{activeCatDef.label}</span>
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="mx-6 mb-4 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
          {error.toLowerCase().includes('fetch')
            ? "Impossible de joindre le serveur : aucun projet Supabase n'est encore connecté. Les thèmes ci-dessus restent consultables ; les membres s'afficheront une fois le backend branché."
            : error}
        </div>
      )}

      {/* Feed */}
      <div className="px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-square rounded-2xl bg-neutral-100 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-neutral-100 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-neutral-100 animate-pulse" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <Search size={28} className="text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Aucun résultat</h3>
            <p className="mt-1 text-sm text-neutral-500">Essayez un autre mot-clé ou changez de catégorie.</p>
          </div>
        ) : (
          filtered.map((p) => {
            const meta = typeMeta[p.account_type];
            return (
              <button
                key={p.id}
                className="group flex flex-col gap-3 text-left"
                onClick={() => navigate(`/profil/${p.id}`)}
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.display_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                      <Avatar name={p.display_name} size={72} />
                    </div>
                  )}

                  {p.verification_status === 'verified' && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <ShieldCheck size={10} /> Vérifié
                    </div>
                  )}

                  {p.account_type !== 'particulier' && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-neutral-900 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                      <meta.icon size={10} /> {meta.label}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-neutral-900 text-[15px] truncate pr-2">{p.display_name}</h3>
                    {p.reviewCount > 0 && (
                      <div className="flex items-center gap-1 text-[14px] flex-shrink-0">
                        <Star size={12} className="fill-neutral-900 text-neutral-900" />
                        <span className="font-semibold">{p.avgRating.toFixed(1)}</span>
                        <span className="text-neutral-400 text-xs">({p.reviewCount})</span>
                      </div>
                    )}
                  </div>
                  {p.city && (
                    <p className="text-neutral-500 text-[15px] truncate flex items-center gap-1">
                      <MapPin size={12} /> {p.city}
                    </p>
                  )}

                  {p.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.skills.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.indicative_rates && (
                    <div className="mt-1.5 text-[15px] font-semibold text-neutral-900">{p.indicative_rates}</div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
