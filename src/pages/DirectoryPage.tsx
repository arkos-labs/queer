import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import type { Category, Subcategory, Profile, Place } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { avg } from '@/lib/utils';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import { AddPlaceModal } from '@/components/AddPlaceModal';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
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
  LifeBuoy,
  Plus,
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

  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);

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
          .select(PUBLIC_PROFILE_COLUMNS)
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

  const isShoppingTheme = activeCatDef?.slug === 'shopping-bonnes-adresses';

  const loadPlaces = async () => {
    setPlacesLoading(true);
    const { data } = await supabase
      .from('places')
      .select('*, subcategory:subcategories(id, label)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setPlaces((data ?? []) as Place[]);
    setPlacesLoading(false);
  };

  useEffect(() => {
    if (isShoppingTheme) loadPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShoppingTheme]);

  const filteredPlaces = useMemo(() => {
    if (!isShoppingTheme) return [];
    let list = places;
    if (activeSub) list = list.filter((p) => p.subcategory_id === activeSub);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [places, isShoppingTheme, activeSub, search]);

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

  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSearch(customEvent.detail);
    };
    window.addEventListener('directory-search', handleSearch);
    return () => window.removeEventListener('directory-search', handleSearch);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-full bg-white animate-fade-in">
      <div className="pt-4">
        <AnnouncementsBanner />
      </div>

      <section className="bg-white border-b border-slate-100 py-4 shadow-sm overflow-x-auto no-scrollbar flex items-center px-4 space-x-6">
        <button
          onClick={() => {
            setActiveCategory(null);
            setActiveSub(null);
            setShowSubBar(false);
          }}
          className={`flex flex-col items-center space-y-2 min-w-fit cursor-pointer ${
            !activeCategory ? 'border-b-2 border-slate-900 pb-1' : 'opacity-60 hover:opacity-100 transition-opacity'
          }`}
        >
          <div className={`p-2 rounded-xl ${!activeCategory ? 'bg-slate-100' : ''}`}>
            <Sparkles size={24} className={!activeCategory ? 'text-slate-900' : ''} />
          </div>
          <span className={`text-xs whitespace-nowrap ${!activeCategory ? 'font-semibold' : 'font-medium'}`}>Tout</span>
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
              className={`flex flex-col items-center space-y-2 min-w-fit cursor-pointer ${
                isActive ? 'border-b-2 border-slate-900 pb-1' : 'opacity-60 hover:opacity-100 transition-opacity'
              }`}
            >
              <div className={`p-2 rounded-xl ${isActive ? 'bg-slate-100' : ''}`}>
                <Icon size={24} className={isActive ? 'text-slate-900' : ''} />
              </div>
              <span className={`text-xs whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>{c.label}</span>
            </button>
          );
        })}
      </section>

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
        {isShoppingTheme && (
          <button onClick={() => setAddPlaceOpen(true)} className="btn-secondary btn-sm shrink-0">
            <Plus size={14} /> Proposer un lieu
          </button>
        )}
      </div>

      {isShoppingTheme && (
        <div className="px-6 pb-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Lieux recommandés par la communauté
          </h2>
          {placesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />)}
            </div>
          ) : filteredPlaces.length === 0 ? (
            <p className="mb-2 text-sm text-neutral-400">Aucun lieu recommandé pour le moment. Soyez le premier à en proposer un !</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaces.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/lieux/${p.id}`)}
                  className="group flex gap-3 rounded-2xl border border-neutral-100 p-3 text-left hover:border-neutral-300 transition-colors"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-300">
                        <MapPin size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900 text-sm">{p.name}</p>
                    {p.subcategory?.label && <p className="text-xs text-neutral-400">{p.subcategory.label}</p>}
                    {p.city && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                        <MapPin size={11} /> {p.city}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mx-6 mb-4 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
          {error.toLowerCase().includes('fetch')
            ? "Impossible de joindre le serveur : aucun projet Supabase n'est encore connecté. Les thèmes ci-dessus restent consultables ; les membres s'afficheront une fois le backend branché."
            : error}
        </div>
      )}

      {activeCatDef?.slug === 'communaute-vie-lgbtq' && (
        <button
          onClick={() => navigate('/ressources')}
          className="mx-6 mb-4 flex w-[calc(100%-3rem)] items-center gap-3 rounded-2xl bg-primary-50 p-4 text-left hover:bg-primary-100 transition-colors"
        >
          <LifeBuoy size={20} className="shrink-0 text-primary-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-primary-800">Numéros utiles &amp; guides</span>
            <span className="block text-xs text-primary-600">Associations, lignes d'écoute, ressources pratiques.</span>
          </span>
        </button>
      )}

      <main className="p-3 pb-24 grid grid-cols-3 gap-3" data-purpose="provider-directory">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <article key={i} className="bg-white rounded-[24px] p-3 shadow-sm border border-slate-100 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-neutral-100 animate-pulse" />
              <div className="h-2.5 w-3/4 rounded bg-neutral-100 animate-pulse mt-1" />
              <div className="h-2 w-1/2 rounded bg-neutral-100 animate-pulse" />
            </article>
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
            return (
              <article
                key={p.id}
                onClick={() => navigate(`/profil/${p.id}`)}
                className="bg-white rounded-[24px] p-3 shadow-sm border border-slate-100 flex flex-col items-center text-center relative group hover:shadow-md transition-all cursor-pointer min-h-[220px]"
              >
                <div className="relative mb-3 mt-1">
                  <div className="w-[60px] h-[60px] rounded-full bg-[#10b981] text-white flex items-center justify-center text-lg font-bold">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                    ) : (
                      p.display_name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  
                  {p.verification_status === 'verified' && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-1.5 py-0.5 rounded-full shadow-sm border border-emerald-100 flex items-center z-10 whitespace-nowrap">
                      <span className="text-[7px] font-bold text-[#10b981] uppercase tracking-wider">
                        VÉRIFIÉ
                      </span>
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-slate-900 text-[11px] line-clamp-1 w-full px-0.5">{p.display_name}</h3>
                
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-900 mt-0.5">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  {p.avgRating > 0 ? (
                    <span>{p.avgRating.toFixed(1)} <span className="font-normal text-slate-400">({p.reviewCount})</span></span>
                  ) : (
                    <span className="font-normal text-slate-400">-</span>
                  )}
                </div>
                
                <div className="flex items-center text-slate-500 text-[9px] mt-0.5 mb-2 truncate max-w-full px-0.5 gap-0.5">
                  <MapPin size={10} /> {p.city || 'Partout'}
                </div>
                
                <div className="flex flex-col gap-1.5 w-full items-center mt-1">
                  {p.skills.slice(0, 2).map((s) => (
                    <span key={s} className="bg-slate-50 text-[9px] px-2 py-0.5 rounded-full text-slate-600 border border-slate-100 truncate w-[90%]">
                      {s}
                    </span>
                  ))}
                </div>

                {p.indicative_rates && (
                  <div className="mt-auto pt-2 w-full flex justify-center">
                    <span className="bg-slate-50 text-[10px] font-bold text-slate-900 px-2.5 py-1 rounded-full border border-slate-100 truncate max-w-full">
                      {p.indicative_rates}
                    </span>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      {addPlaceOpen && (
        <AddPlaceModal
          subcategories={subsForActiveCat}
          onClose={() => setAddPlaceOpen(false)}
          onSubmitted={loadPlaces}
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
