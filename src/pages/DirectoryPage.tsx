import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import type { Category, Subcategory, PublicProfile, Place } from '@/lib/types';
import { avg } from '@/lib/utils';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import { AddPlaceModal } from '@/components/AddPlaceModal';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/Breadcrumbs';
import { useDirectoryCategorySEO } from '@/lib/useSEO';
import { useRealtimeTick } from '@/lib/realtime';
import { CATEGORY_ICONS, CATEGORY_ICON_FALLBACK } from '@/lib/categoryIcons';
import { TARGET_CITIES, cityMatches } from '@/lib/cities';
import { SCREENSHOT_DEMO_PROFILES } from '@/lib/screenshotDemo';
import {
  Compass,
  Search,
  Star,
  MapPin,
  Users,
  ShieldCheck,
  LifeBuoy,
  Plus,
  Bell,
} from 'lucide-react';

interface ProfileWithStats extends PublicProfile {
  subIds: Set<string>;
  avgRating: number;
  reviewCount: number;
}

export function DirectoryPage({ categorySlug, citySlug }: { categorySlug?: string; citySlug?: string }) {
  const { navigate } = useRouter();
  const { user, profile: myProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [profileKind, setProfileKind] = useState<'all' | 'member' | 'organization' | 'places'>('all');

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const rtTick = useRealtimeTick(['profile_subcategories', 'reviews']);
  const [alertSet, setAlertSet] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);

  // "Notify me when someone joins" for an empty subcategory.
  useEffect(() => {
    setAlertSet(false);
    if (!user || !activeSub) return;
    let cancelled = false;
    supabase
      .from('search_alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('subcategory_id', activeSub)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setAlertSet(!!data); });
    return () => { cancelled = true; };
  }, [user, activeSub]);

  const toggleAlert = async () => {
    if (!user || !activeSub || alertBusy) return;
    setAlertBusy(true);
    if (alertSet) {
      await supabase.from('search_alerts').delete().eq('user_id', user.id).eq('subcategory_id', activeSub);
      setAlertSet(false);
    } else {
      const { error: alertErr } = await supabase
        .from('search_alerts')
        .upsert({ user_id: user.id, subcategory_id: activeSub }, { onConflict: 'user_id,subcategory_id' });
      if (!alertErr) setAlertSet(true);
    }
    setAlertBusy(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      if (rtTick === 0) setLoading(true);
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
        const [profRes, blocksRes] = await Promise.all([
          supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('profile_status', 'active').order('created_at', { ascending: false }),
          supabase.from('blocked_users').select('blocker_id, blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
        ]);
        if (cancelled) return;

        if (profRes.error) {
          setError(profRes.error.message);
          setProfiles([]);
          setLoading(false);
          return;
        }

        const blockedIds = new Set((blocksRes.data ?? []).map((block) => block.blocker_id === user.id ? block.blocked_id : block.blocker_id));
        const realProfiles = ((profRes.data ?? []) as PublicProfile[]).filter((member) => !blockedIds.has(member.id));
        const allProfiles = [...SCREENSHOT_DEMO_PROFILES, ...realProfiles];
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
          const demoRating = p.id.startsWith('demo-') ? { avg: 4.8, count: 12 } : null;
          return {
            ...p,
            subIds: subsByProfile.get(p.id) ?? new Set(),
            avgRating: demoRating?.avg ?? avg(ratings),
            reviewCount: demoRating?.count ?? ratings.length,
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
  }, [user, navigate, rtTick]);

  // The URL is the source of truth for which category is active (so
  // /annuaire/bricolage is bookmarkable/crawlable) — resolve it against the
  // loaded categories whenever either changes, including browser back/forward.
  useEffect(() => {
    if (categories.length === 0) return;
    const match = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
    setActiveCategory(match?.id ?? null);
    setActiveSub(null);
  }, [categorySlug, categories]);

  const activeCatDef = categories.find((c) => c.id === activeCategory);
  const isShoppingCategory = activeCatDef?.slug === 'shopping-bonnes-adresses';
  const activeCity = citySlug ? TARGET_CITIES.find((c) => c.slug === citySlug) ?? null : null;
  const subsForActiveCat = subcategories.filter((s) => s.category_id === activeCategory);
  const subcategoryById = useMemo(() => new Map(subcategories.map((s) => [s.id, s])), [subcategories]);

  const loadPlaces = async () => {
    setPlacesLoading(true);
    const { data } = await supabase
      .from('places')
      .select('*, subcategory:subcategories(id, label)')
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
    if (activeCity) list = list.filter((p) => cityMatches(p.city, activeCity));
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
  }, [places, activeCategory, subcategories, activeSub, activeCity, search]);

  const filtered = useMemo(() => {
    let list = profiles.filter((p) => p.id !== myProfile?.id);

    if (profileKind === 'member') list = list.filter((p) => p.account_type === 'particulier');
    if (profileKind === 'organization') list = list.filter((p) => p.account_type === 'pro');

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

    if (activeCity) list = list.filter((p) => cityMatches(p.city, activeCity));

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
  }, [profiles, activeCategory, activeSub, activeCity, search, subcategories, subcategoryById, myProfile, profileKind]);

  useDirectoryCategorySEO(activeCatDef, filtered.length, activeCity);

  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSearch(customEvent.detail);
    };
    window.addEventListener('directory-search', handleSearch);
    return () => window.removeEventListener('directory-search', handleSearch);
  }, []);

  if (!user) return null;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Accueil', to: '/' },
    { label: 'Annuaire', to: activeCatDef ? '/annuaire' : undefined },
  ];
  if (activeCatDef) {
    breadcrumbItems.push({ label: activeCatDef.label, to: activeCity ? `/annuaire/${activeCatDef.slug}` : undefined });
  }
  if (activeCity && activeCatDef) {
    breadcrumbItems.push({ label: activeCity.label });
  }

  return (
    <div className="min-h-full bg-[#f3f0ff] pt-3 animate-fade-in">
      {activeCatDef && <Breadcrumbs items={breadcrumbItems} navigate={navigate} />}

      <div className="px-5">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Compass size={20} className="text-primary-500" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Montage cuisine, ménage, pet-sitting..."
            className="block w-full rounded-[26px] border border-white bg-white py-4 pl-12 pr-4 text-base text-neutral-900 shadow-soft outline-none placeholder-text-muted focus:border-primary-500 focus:ring-1 focus:ring-primary-500 md:text-sm"
          />
        </div>
      </div>

      {/* Categories (Main) */}
      <section className="no-scrollbar flex items-start gap-7 overflow-x-auto px-7 pb-2 pt-6">
        <button
          onClick={() => navigate('/annuaire')}
          className="flex min-w-fit cursor-pointer flex-col items-center gap-2"
        >
          <div className={`flex h-[66px] w-[66px] items-center justify-center rounded-full transition-all ${
            !activeCategory ? 'bg-[#20c7a3] shadow-lift text-white' : 'border border-gold-hairline bg-white shadow-soft hover:shadow-lift text-ink-muted'
          }`}>
            <Users size={22} />
          </div>
          <span className={`relative max-w-[92px] pb-2 text-center text-[12px] leading-tight ${!activeCategory ? 'font-bold text-ink-base' : 'font-semibold text-ink-muted'}`}>
            Tous les membres
            {!activeCategory && <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-[#20c7a3] to-primary-600" />}
          </span>
        </button>

        {categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.icon ?? ''] ?? CATEGORY_ICON_FALLBACK;
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => navigate(isActive ? '/annuaire' : `/annuaire/${c.slug}`)}
              className="flex min-w-fit cursor-pointer flex-col items-center gap-2"
            >
              <div className={`flex h-[66px] w-[66px] items-center justify-center rounded-full transition-all ${
                isActive ? 'bg-[#20c7a3] shadow-lift text-white' : 'border border-gold-hairline bg-white shadow-soft hover:shadow-lift text-ink-muted'
              }`}>
                <Icon size={22} />
              </div>
              <span className={`relative max-w-[96px] pb-2 text-center text-[12px] leading-tight ${isActive ? 'font-bold text-ink-base' : 'font-semibold text-ink-muted'}`}>
                {c.label.replace(' & ', ' & ')}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-[#20c7a3] to-primary-600" />}
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

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
        {[
          { id: 'all' as const, label: 'Tout voir' },
          { id: 'member' as const, label: 'Membres' },
          { id: 'organization' as const, label: 'Associations & structures' },
        ].map((kind) => (
          <button
            key={kind.id}
            onClick={() => setProfileKind(kind.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition-all ${
              profileKind === kind.id
                ? 'bg-ink-base text-white shadow-soft'
                : 'border border-gold-hairline bg-white text-ink-muted shadow-sm'
            }`}
          >
            {kind.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="container-app mt-5 flex items-center justify-between py-2">
        <p className="text-[16px] font-medium text-ink-muted">
          {isShoppingCategory ? (
            <><span className="font-display text-2xl font-bold text-ink-base">{filteredPlaces.length}</span> lieu{filteredPlaces.length > 1 ? 'x' : ''}</>
          ) : (
            <><span className="font-display text-2xl font-bold text-ink-base">{filtered.length}</span> membre{filtered.length > 1 ? 's' : ''} <span className="text-xs">· {places.length} lieu{places.length > 1 ? 'x' : ''} recommandé{places.length > 1 ? 's' : ''}</span></>
          )} {activeSub && subcategoryById.get(activeSub) && <span>en <span className="font-bold text-ink-base">{subcategoryById.get(activeSub)!.label}</span></span>}
          {activeCity && <span> à <span className="font-bold text-ink-base">{activeCity.label}</span></span>}
        </p>
        {isShoppingCategory && <button onClick={() => setAddPlaceOpen(true)} className="flex items-center gap-1.5 rounded-2xl border border-gold-hairline bg-white px-4 py-2.5 text-[12px] font-semibold text-ink-base shadow-soft transition-all hover:bg-white/80"><Plus size={14} /> Proposer un lieu</button>}
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

      {!isShoppingCategory && (
        <main className="container-app grid grid-cols-2 gap-4 pb-12 pt-4 sm:grid-cols-3 lg:grid-cols-4" data-purpose="provider-directory">
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
            {user && activeSub && subcategoryById.get(activeSub) && (
              <button
                onClick={toggleAlert}
                disabled={alertBusy}
                className={`mx-auto mt-5 flex max-w-[300px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[13px] font-semibold shadow-soft transition-all active:scale-[0.98] ${
                  alertSet ? 'border border-primary-200 bg-primary-50 text-primary-700' : 'btn-primary'
                }`}
              >
                <Bell size={16} />
                {alertSet ? 'Alerte activée · Annuler' : `Me prévenir dès qu'un·e membre propose « ${subcategoryById.get(activeSub)!.label} »`}
              </button>
            )}
          </div>
        ) : (
          filtered.map((p) => {
            return (
              <article
                key={p.id}
                onClick={() => navigate(`/profil/${p.id}`)}
                className="group relative flex min-h-[15rem] cursor-pointer flex-col items-center rounded-[28px] border border-white bg-white p-4 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative mb-2">
                  <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-paper-base shadow-sm ring-2 ring-white text-lg font-bold uppercase text-ink-muted">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.display_name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      p.display_name.substring(0, 2).toUpperCase()
                    )}
                  </div>

                  {p.verification_status === 'verified' && (
                    <div className="absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-gold-hairline bg-white px-1.5 py-0.5 shadow-sm">
                      <ShieldCheck size={9} className="mr-0.5 text-patina-deep" />
                      <span className="text-[8px] font-bold uppercase tracking-wider text-patina-deep">Compte vérifié</span>
                    </div>
                  )}
                </div>

                <h3 className="w-full break-words px-0.5 font-display text-[15px] font-bold leading-tight text-ink-base">{p.display_name}</h3>

                {p.account_type === 'pro' && (
                  <span className="mt-1 rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-bold text-primary-700">Association / structure</span>
                )}

                <div className="mt-1 flex items-center gap-0.5 text-[12px] font-bold text-ink-base">
                  {p.avgRating > 0 ? (
                    <><span className="flex">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={10} className="fill-[#D4AF37] text-[#D4AF37]" />)}</span><span className="ml-1">{p.avgRating.toFixed(1)} <span className="font-normal text-ink-muted">({p.reviewCount})</span></span></>
                  ) : (
                    <span className="font-normal text-ink-muted">-</span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-0.5 truncate px-0.5 text-[11px] text-ink-muted">
                  <MapPin size={11} /> {p.city || 'Partout'}
                </div>

                <div className="mt-1.5 flex w-full flex-col items-center gap-1">
                  {p.skills.slice(0, 1).map((s) => (
                    <span key={s} className="w-[94%] truncate rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700">
                      {s}
                    </span>
                  ))}
                </div>

                {p.indicative_rates && (
                  <div className="mt-auto w-full pt-1.5">
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

      {isShoppingCategory && (
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
              : filteredPlaces.length === 0 ? (
                  <div className="col-span-full rounded-2xl bg-white p-6 text-center text-sm text-ink-muted shadow-soft">Aucun lieu ne correspond encore à cette recherche.</div>
                ) : filteredPlaces.map((place) => (
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
          subcategories={subcategories}
          categories={categories}
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
