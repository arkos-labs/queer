import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import type { Category, Subcategory } from '@/lib/types';
import { getCategoryColor, RAINBOW_GRADIENT } from '@/lib/colors';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  ChevronRight,
  Check,
  Sparkles,
  Wrench,
  HeartPulse,
  Scale,
  Scissors,
  GraduationCap,
  PawPrint,
  Car,
  Users,
} from 'lucide-react';

const ICONS: Record<string, typeof Search> = {
  Wrench,
  HeartPulse,
  Scale,
  Scissors,
  GraduationCap,
  PawPrint,
  Car,
  Users,
};

interface RainbowExplorerProps {
  /** When true, tapping a theme navigates to the directory filtered by it. */
  navigateOnSelect?: boolean;
  /** Compact mode for embedding in hero sections. */
  compact?: boolean;
}

export function RainbowExplorer({ navigateOnSelect = true, compact = false }: RainbowExplorerProps) {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [catRes, subRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
      ]);
      if (cancelled) return;
      setCategories((catRes.data as Category[]) ?? []);
      setSubcategories((subRes.data as Subcategory[]) ?? []);
      setLoaded(true);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const subsForActive = subcategories.filter((s) => s.category_id === activeCategory);

  const goToDirectory = (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    navigate(qs ? `/annuaire?${qs}` : '/annuaire');
  };

  const handleCategory = (catId: string) => {
    const next = activeCategory === catId ? null : catId;
    setActiveCategory(next);
    setActiveSub(null);
    if (next && navigateOnSelect) {
      const cat = categories.find((c) => c.id === next);
      if (cat) goToDirectory({ theme: cat.slug });
    }
  };

  const handleSub = (subId: string) => {
    const next = activeSub === subId ? null : subId;
    setActiveSub(next);
    if (next && navigateOnSelect) {
      const sub = subcategories.find((s) => s.id === next);
      if (sub) {
        const cat = categories.find((c) => c.id === sub.category_id);
        goToDirectory({ theme: cat?.slug ?? '', sous: sub.slug });
      }
    }
  };

  const onSearch = () => {
    goToDirectory(search.trim() ? { q: search.trim() } : {});
  };

  return (
    <div className={cn('w-full', compact ? '' : 'mt-2')}>
      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pl-12 pr-12 text-sm text-neutral-900 shadow-soft placeholder-neutral-400 transition focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
          placeholder="Rechercher un service, un talent…"
        />
        {search ? (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95"
          >
            Chercher
          </button>
        )}
        {/* Rainbow underline */}
        <div
          className="mt-2 h-1.5 w-full rounded-full"
          style={{ background: RAINBOW_GRADIENT }}
        />
      </div>

      {/* Themes — rainbow arc bands */}
      <div className={cn('space-y-2.5', compact ? 'mt-4' : 'mt-5')}>
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Thèmes
        </p>

        {/* "Tout" band */}
        <button
          onClick={() => goToDirectory()}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.98]',
            !activeCategory
              ? 'bg-neutral-900 text-white shadow-md'
              : 'bg-white text-neutral-700 shadow-soft ring-1 ring-neutral-200/60',
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

        {/* Category bands */}
        {loaded &&
          categories.map((c) => {
            const color = getCategoryColor(c.slug);
            const Icon = ICONS[c.icon ?? ''] ?? Search;
            const isActive = activeCategory === c.id;
            return (
              <div key={c.id}>
                <button
                  onClick={() => handleCategory(c.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.98]',
                    isActive ? 'text-white shadow-md' : 'bg-white text-neutral-700 shadow-soft ring-1 ring-neutral-200/60',
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

                {/* Sub-themes */}
                {isActive && subsForActive.length > 0 && (
                  <div
                    className="mt-1.5 ml-3 mr-3 space-y-2 rounded-2xl p-3"
                    style={{ background: color.solid + '08' }}
                  >
                    <p
                      className="px-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: color.solid }}
                    >
                      Sous-thèmes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {subsForActive.map((s) => {
                        const subActive = activeSub === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => handleSub(s.id)}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95',
                              subActive ? 'text-white' : 'bg-white text-neutral-600',
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

        {/* Skeleton while loading */}
        {!loaded &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
      </div>
    </div>
  );
}
