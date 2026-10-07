import { AvatarBadges } from '@/components/IdentityBadges';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { Category, Subcategory, PublicDirectoryListing } from '@/lib/types';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import { CATEGORY_ICONS, CATEGORY_ICON_FALLBACK } from '@/lib/categoryIcons';
import { TARGET_CITIES, cityMatches } from '@/lib/cities';
import { useDirectoryCategorySEO } from '@/lib/useSEO';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/Breadcrumbs';
import { Users, MapPin, Star, ShieldCheck, LogIn } from 'lucide-react';
import type { ReactNode } from 'react';

// A real <a href> (crawlable) that still does client-side SPA navigation —
// this page's whole point is to be a set of links a crawler can follow, not
// just buttons a user can click.
function NavLink({ to, navigate, className, children }: {
  to: string;
  navigate: (to: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className={className}
    >
      {children}
    </a>
  );
}

// The logged-out counterpart of DirectoryPage — renders the same category
// tabs but backed by the anonymized public_directory_listings view (see its
// migration), never the real `profiles` table, so a visitor never sees a
// name, photo or contact info without signing in. This is what search
// engines actually get to crawl.
export function PublicDirectoryPreview({ categorySlug, citySlug }: { categorySlug?: string; citySlug?: string }) {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [listings, setListings] = useState<PublicDirectoryListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [catRes, subRes, listingsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
        supabase.from('public_directory_listings').select('*'),
      ]);
      if (cancelled) return;
      setCategories(catRes.error || !catRes.data?.length ? FALLBACK_CATEGORIES : (catRes.data as Category[]));
      setSubcategories(subRes.error || !subRes.data?.length ? FALLBACK_SUBCATEGORIES : (subRes.data as Subcategory[]));
      setListings((listingsRes.data ?? []) as PublicDirectoryListing[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) ?? null : null;
  const activeCity = citySlug ? TARGET_CITIES.find((c) => c.slug === citySlug) ?? null : null;

  const filtered = useMemo(() => {
    let list = listings;
    if (activeCategory) {
      const subIdsInCat = new Set(subcategories.filter((s) => s.category_id === activeCategory.id).map((s) => s.id));
      list = list.filter((l) => l.subcategory_ids.some((id) => subIdsInCat.has(id)));
    }
    if (activeCity) list = list.filter((l) => cityMatches(l.city, activeCity));
    return list;
  }, [listings, activeCategory, subcategories, activeCity]);

  useDirectoryCategorySEO(activeCategory, filtered.length, activeCity);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Accueil', to: '/' },
    { label: 'Annuaire', to: activeCategory ? '/annuaire' : undefined },
  ];
  if (activeCategory) {
    breadcrumbItems.push({ label: activeCategory.label, to: activeCity ? `/annuaire/${activeCategory.slug}` : undefined });
  }
  if (activeCity && activeCategory) {
    breadcrumbItems.push({ label: activeCity.label });
  }

  return (
    <div className="min-h-full bg-paper-base animate-fade-in">
      {activeCategory && <Breadcrumbs items={breadcrumbItems} navigate={navigate} />}

      <div className="container-app pt-4 pb-2 text-center">
        <h1 className="font-display text-xl font-bold text-ink-base">
          {activeCategory
            ? `${activeCategory.label}${activeCity ? ` à ${activeCity.label}` : ''}`
            : "Annuaire d'entraide de la communauté LGBTQI+"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Des membres de la communauté qui proposent leurs services, en confiance. Parcourez librement l'annuaire. Un compte gratuit n'est nécessaire que pour contacter un membre.
        </p>
      </div>

      {/* Categories — real <a href> so crawlers can follow these into the
          category pages, not just users clicking a button. */}
      <section className="no-scrollbar flex items-center gap-6 overflow-x-auto px-6 pb-2 mt-2">
        <NavLink to="/annuaire" navigate={navigate} className="flex min-w-fit cursor-pointer flex-col items-center gap-2">
          <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full transition-all ${
            !activeCategory ? 'bg-patina-deep shadow-soft text-white' : 'bg-white border border-gold-hairline shadow-sm hover:shadow-soft text-ink-muted'
          }`}>
            <Users size={22} />
          </div>
          <span className={`text-[11px] ${!activeCategory ? 'font-bold text-ink-base border-b-2 border-patina-deep pb-1' : 'font-semibold text-ink-muted pb-1'}`}>
            Tous les membres
          </span>
        </NavLink>

        {categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.icon ?? ''] ?? CATEGORY_ICON_FALLBACK;
          const isActive = activeCategory?.id === c.id;
          return (
            <NavLink
              key={c.id}
              to={isActive ? '/annuaire' : `/annuaire/${c.slug}`}
              navigate={navigate}
              className="flex min-w-fit cursor-pointer flex-col items-center gap-2"
            >
              <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full transition-all ${
                isActive ? 'bg-patina-deep shadow-soft text-white' : 'bg-white border border-gold-hairline shadow-sm hover:shadow-soft text-ink-muted'
              }`}>
                <Icon size={22} />
              </div>
              <span className={`text-[11px] ${isActive ? 'font-bold text-ink-base border-b-2 border-patina-deep pb-1' : 'font-semibold text-ink-muted pb-1'}`}>
                {c.label}
              </span>
            </NavLink>
          );
        })}
      </section>

      {/* City chips — only within a category (see cities.ts) */}
      {activeCategory && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2 mt-1 mb-2">
          {TARGET_CITIES.map((city) => {
            const isCityActive = activeCity?.slug === city.slug;
            return (
              <NavLink
                key={city.slug}
                to={isCityActive ? `/annuaire/${activeCategory.slug}` : `/annuaire/${activeCategory.slug}/${city.slug}`}
                navigate={navigate}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                  isCityActive
                    ? 'bg-patina-deep text-white shadow-soft'
                    : 'border border-gold-hairline bg-white/50 backdrop-blur-md text-ink-muted hover:bg-white/80'
                }`}
              >
                {city.label}
              </NavLink>
            );
          })}
        </div>
      )}

      <div className="container-app flex items-center justify-between py-2 mt-4">
        <p className="text-[13px] font-medium text-ink-muted">
          <span className="font-bold text-ink-base">{filtered.length}</span> membre{filtered.length > 1 ? 's' : ''}
          {activeCity && <span> à <span className="font-bold text-ink-base">{activeCity.label}</span></span>}
        </p>
      </div>

      {loading ? (
        <div className="container-app grid grid-cols-2 gap-4 pb-12 pt-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <article key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-4 shadow-soft">
              <div className="h-16 w-16 rounded-full bg-paper-base animate-pulse" />
              <div className="h-2.5 w-3/4 rounded bg-paper-base animate-pulse mt-1" />
              <div className="h-2 w-1/2 rounded bg-paper-base animate-pulse" />
            </article>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="container-app py-16 text-center">
          <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white border border-gold-hairline shadow-soft">
            <Users size={28} className="text-patina-deep" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-[17px] font-bold text-ink-base">Bientôt des membres ici</h3>
          <p className="mt-3 text-[13px] text-ink-muted mx-auto max-w-[280px] leading-relaxed">
            Cette catégorie n'a pas encore de prestataire. Soyez parmi les premier·ères à rejoindre Queer Service.
          </p>
          <button
            onClick={() => navigate('/inscription')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-patina-deep px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-colors"
          >
            <LogIn size={16} /> Rejoindre la communauté
          </button>
        </div>
      ) : (
        <main className="container-app grid grid-cols-2 gap-4 pb-8 pt-2 sm:grid-cols-3 lg:grid-cols-4" data-purpose="provider-directory-public">
          {filtered.map((l) => (
            <article
              key={l.id}
              onClick={() => navigate(`/profil/${l.id}`)}
              className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-4 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="relative mb-3 mt-1">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-paper-base shadow-sm ring-2 ring-white text-xl font-bold uppercase text-ink-muted">
                  {l.display_initial}
                </div>
                <AvatarBadges accountType={l.account_type} size="sm" />
              </div>


              {l.company_name && (
                <h3 className="mt-0.5 w-full break-words px-0.5 font-display text-[14px] font-bold leading-tight text-ink-base">{l.company_name}</h3>
              )}

              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-ink-base">
                <Star size={11} className="fill-[#D4AF37] text-[#D4AF37]" />
                {l.avg_rating > 0 ? (
                  <span>{l.avg_rating.toFixed(1)} <span className="font-normal text-ink-muted">({l.review_count})</span></span>
                ) : (
                  <span className="font-normal text-ink-muted">-</span>
                )}
              </div>

              <div className="mt-0.5 flex items-center gap-0.5 truncate px-0.5 text-[10px] text-ink-muted">
                <MapPin size={11} /> {l.city || 'Partout'}
              </div>

              <div className="mt-2 flex w-full flex-col items-center gap-1.5">
                {l.skills.slice(0, 2).map((s) => (
                  <span key={s} className="w-[90%] truncate rounded-full border border-gold-hairline bg-white px-2 py-0.5 text-[10px] font-medium text-ink-base shadow-sm">
                    {s}
                  </span>
                ))}
              </div>

              <span className="mt-3 text-[10px] font-semibold text-patina-deep opacity-0 transition-opacity group-hover:opacity-100">
                Voir le profil
              </span>
            </article>
          ))}
        </main>
      )}

      <div className="container-app pb-16 pt-4">
        <button
          onClick={() => navigate('/inscription')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-patina-deep px-4 py-3 text-[15px] font-semibold text-white shadow-sm hover:brightness-110 transition-colors"
        >
          <LogIn size={18} /> Créer un compte pour contacter les membres
        </button>
        <p className="mt-3 text-center text-[13px] text-ink-muted">
          Déjà membre ?{' '}
          <button onClick={() => navigate('/connexion')} className="font-semibold text-primary-700 underline-offset-2 hover:underline">Se connecter</button>
        </p>
      </div>
    </div>
  );
}
