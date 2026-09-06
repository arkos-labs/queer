import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import type { Category, Subcategory, Profile, Place } from '@/lib/types';
import { avg } from '@/lib/utils';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import { AddPlaceModal } from '@/components/AddPlaceModal';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
import {
  Search,
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
  LifeBuoy,
  Plus,
  HelpCircle,
  Megaphone,
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

export function DirectoryPage() {
  const { navigate } = useRouter();
  const { user, profile: myProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);

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
          if (!activeCategory) setActiveCategory(FALLBACK_CATEGORIES[0].id);
        } else {
          setCategories(catRes.data as Category[]);
          setSubcategories((subRes.data ?? []) as Subcategory[]);
          if (!activeCategory && catRes.data?.length) setActiveCategory(catRes.data[0].id);
        }
      } catch {
        if (cancelled) return;
        setCategories(FALLBACK_CATEGORIES);
        setSubcategories(FALLBACK_SUBCATEGORIES);
        if (!activeCategory) setActiveCategory(FALLBACK_CATEGORIES[0].id);
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
    loadPlaces();
  }, []);

  const filteredPlaces = useMemo(() => {
    let list = places;
    
    if (activeCategory) {
      const subIdsInCat = new Set(subcategories.filter((s) => s.category_id === activeCategory).map((s) => s.id));
      list = list.filter((p) => (p.subcategory_id ? subIdsInCat.has(p.subcategory_id) : false));
    }
    
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
  }, [places, activeCategory, subcategories, activeSub, search]);

  const filtered = useMemo(() => {
    let list = profiles.filter((p) => p.id !== myProfile?.id);

    if (activeCategory) {
      const subsInCat = subcategories.filter((s) => s.category_id === activeCategory);
      const subIdsInCat = new Set(subsInCat.map((s) => s.id));
      const subLabelsInCat = new Set(subsInCat.map((s) => s.label.toLowerCase()));

      list = list.filter((p) => 
        Array.from(p.subIds).some((id) => subIdsInCat.has(id)) ||
        p.skills.some((skill) => subLabelsInCat.has(skill.toLowerCase()))
      );
    }

    if (activeSub) {
      const subDef = subcategoryById.get(activeSub);
      list = list.filter((p) => 
        p.subIds.has(activeSub) ||
        (subDef && p.skills.some((skill) => skill.toLowerCase() === subDef.label.toLowerCase()))
      );
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
    <div className="min-h-full bg-paper-base animate-fade-in">
      {/* Spacer for the floating logo */}
      <div className="pt-[110px]" />
      
      <div className="px-4">
        <AnnouncementsBanner />
      </div>

      <div className="px-4 mt-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Compass size={20} className="text-primary-500" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Montage cuisine, ménage, pet-sitting..."
            className="block w-full pl-12 pr-4 py-3 bg-white text-neutral-900 rounded-2xl border border-neutral-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm text-base md:text-sm outline-none placeholder-text-muted"
          />
        </div>
      </div>

      {/* Categories (Main) */}
      <section className="no-scrollbar flex items-center gap-6 overflow-x-auto px-6 pb-2 mt-4">
        <button
          onClick={() => {
            setActiveCategory(null);
            setActiveSub(null);
          }}
          className="flex min-w-fit cursor-pointer flex-col items-center gap-2"
        >
          <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full transition-all ${
            !activeCategory ? 'bg-patina-deep shadow-soft text-white' : 'bg-white border border-gold-hairline shadow-sm hover:shadow-soft text-ink-muted'
          }`}>
            <Users size={22} />
          </div>
          <span className={`text-[11px] ${!activeCategory ? 'font-bold text-ink-base border-b-2 border-patina-deep pb-1' : 'font-semibold text-ink-muted pb-1'}`}>
            Tous les membres
          </span>
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
                } else {
                  setActiveCategory(c.id);
                  setActiveSub(null);
                }
              }}
              className="flex min-w-fit cursor-pointer flex-col items-center gap-2"
            >
              <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full transition-all ${
                isActive ? 'bg-patina-deep shadow-soft text-white' : 'bg-white border border-gold-hairline shadow-sm hover:shadow-soft text-ink-muted'
              }`}>
                <Icon size={22} />
              </div>
              <span className={`text-[11px] ${isActive ? 'font-bold text-ink-base border-b-2 border-patina-deep pb-1' : 'font-semibold text-ink-muted pb-1'}`}>
                {c.label.replace(' & ', ' & ')}
              </span>
            </button>
          );
        })}
      </section>

      {/* Subcategories */}
      {activeCategory && subsForActiveCat.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2 mt-1 mb-2 animate-fade-in">
          {subsForActiveCat.map((sub) => {
            const isSubActive = activeSub === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSub(isSubActive ? null : sub.id)}
                className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${
                  isSubActive
                    ? 'bg-ink-base text-paper-base shadow-soft'
                    : 'border border-gold-hairline bg-white/50 backdrop-blur-md text-ink-muted hover:bg-white/80'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results count */}
      <div className="container-app flex items-center justify-between py-2 mt-4">
        <p className="text-[13px] font-medium text-ink-muted">
          <span className="font-bold text-ink-base">{filtered.length}</span>{' '}
          membre{filtered.length > 1 ? 's' : ''} {activeSub && subcategoryById.get(activeSub) && <span>en <span className="font-bold text-ink-base">{subcategoryById.get(activeSub)!.label}</span></span>}
        </p>
        <button onClick={() => setAddPlaceOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-gold-hairline bg-white/50 px-3 py-2 text-[11px] font-semibold text-ink-base hover:bg-white/80 transition-all shadow-sm">
          <Plus size={12} /> Proposer un lieu
        </button>
      </div>

      {error && (
        <div className="container-app mb-4 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
          {error.toLowerCase().includes('fetch')
            ? "Impossible de joindre le serveur : aucun projet Supabase n'est encore connecté. Les thèmes ci-dessus restent consultables ; les membres s'afficheront une fois le backend branché."
            : error}
        </div>
      )}

      {activeCatDef?.slug === 'communaute-vie-lgbtq' && (
        <button
          onClick={() => navigate('/ressources')}
          className="container-app mb-4 flex w-full items-center gap-3 rounded-2xl bg-primary-50 p-4 text-left hover:bg-primary-100 transition-colors"
        >
          <LifeBuoy size={20} className="shrink-0 text-primary-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-primary-800">Numéros utiles &amp; guides</span>
            <span className="block text-xs text-primary-600">Associations, lignes d'écoute, ressources pratiques.</span>
          </span>
        </button>
      )}

      {activeCatDef?.slug !== 'shopping-bonnes-adresses' && (
        <main className="container-app grid grid-cols-2 gap-4 pb-12 pt-2 sm:grid-cols-3 lg:grid-cols-4" data-purpose="provider-directory">
          {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <article key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-4 shadow-soft">
              <div className="h-16 w-16 rounded-full bg-paper-base animate-pulse" />
              <div className="h-2.5 w-3/4 rounded bg-paper-base animate-pulse mt-1" />
              <div className="h-2 w-1/2 rounded bg-paper-base animate-pulse" />
            </article>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white border border-gold-hairline shadow-soft">
              <Search size={28} className="text-patina-deep" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-[17px] font-bold text-ink-base">Aucun résultat</h3>
            <p className="mt-3 text-[13px] text-ink-muted mx-auto max-w-[280px] leading-relaxed">
              Essayez un autre mot-clé ou parcourez une différente catégorie pour trouver ce que vous cherchez.
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            return (
              <article
                key={p.id}
                onClick={() => navigate(`/profil/${p.id}`)}
                className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-4 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative mb-3 mt-1">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-paper-base shadow-sm ring-2 ring-white text-xl font-bold uppercase text-ink-muted">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.display_name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      p.display_name.substring(0, 2).toUpperCase()
                    )}
                  </div>

                  {p.verification_status === 'verified' && (
                    <div className="absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-gold-hairline bg-white px-1.5 py-0.5 shadow-sm">
                      <ShieldCheck size={9} className="mr-0.5 text-patina-deep" />
                      <span className="text-[7px] font-bold uppercase tracking-wider text-patina-deep">Vérifié</span>
                    </div>
                  )}
                </div>

                <h3 className="w-full truncate px-0.5 font-display text-[13px] font-semibold text-ink-base">{p.display_name}</h3>

                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-ink-base">
                  <Star size={11} className="fill-[#D4AF37] text-[#D4AF37]" />
                  {p.avgRating > 0 ? (
                    <span>{p.avgRating.toFixed(1)} <span className="font-normal text-ink-muted">({p.reviewCount})</span></span>
                  ) : (
                    <span className="font-normal text-ink-muted">-</span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center gap-0.5 truncate px-0.5 text-[10px] text-ink-muted">
                  <MapPin size={11} /> {p.city || 'Partout'}
                </div>

                <div className="mt-2 flex w-full flex-col items-center gap-1.5">
                  {p.skills.slice(0, 2).map((s) => (
                    <span key={s} className="w-[90%] truncate rounded-full border border-gold-hairline bg-white px-2 py-0.5 text-[10px] font-medium text-ink-base shadow-sm">
                      {s}
                    </span>
                  ))}
                </div>

                {p.indicative_rates && (
                  <div className="mt-auto w-full pt-2">
                    <span className="inline-block max-w-full truncate rounded-full bg-paper-base border border-gold-hairline px-2.5 py-1 text-[10px] font-bold text-ink-base shadow-sm">
                      {p.indicative_rates}
                    </span>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>
      )}

      {/* Places (Lieux recommandés) - Only shown when a category is selected */}
      {activeCategory && (filteredPlaces.length > 0 || placesLoading) && (
        <div className="container-app pb-28 pt-6 border-t border-gold-hairline">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-base">Lieux &amp; Commerces</h2>
              <p className="text-sm text-ink-muted">Recommandés par la communauté</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {placesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-2xl border border-gold-hairline bg-white/60 p-2 shadow-soft">
                    <div className="aspect-square w-full rounded-xl bg-paper-base animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-paper-base animate-pulse mt-1" />
                    <div className="h-2 w-1/2 rounded bg-paper-base animate-pulse" />
                  </div>
                ))
              : filteredPlaces.map((place) => (
                  <article key={place.id} onClick={() => navigate(`/lieux/${place.id}`)} className="group relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-2 shadow-soft transition-all hover:shadow-lift hover:-translate-y-0.5">
                    {place.photo_url ? (
                      <div className="aspect-square w-full overflow-hidden rounded-xl bg-paper-base">
                        <img src={place.photo_url} alt={place.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-paper-base border border-gold-hairline">
                        <MapPin size={24} className="text-patina-deep/50" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-display text-[12px] font-bold text-ink-base line-clamp-1">{place.name}</h3>
                      {place.subcategory && (
                        <p className="mt-0.5 text-[10px] text-ink-muted line-clamp-1">{place.subcategory.label}</p>
                      )}
                      {place.city && (
                        <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-patina-deep">
                          <MapPin size={10} />
                          <span className="line-clamp-1">{place.city}</span>
                        </p>
                      )}
                    </div>
                  </article>
                ))}
          </div>
        </div>
      )}

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
