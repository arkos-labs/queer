import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';
import { Calendar, MapPin, ExternalLink, Search } from 'lucide-react';

const CITIES = ['Toutes', 'Paris', 'Marseille', 'Lyon', 'Bordeaux', 'Toulouse', 'Nice', 'Nantes', 'Montpellier'];

function formatDate(dateStr: string, endDateStr?: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const start = new Date(dateStr).toLocaleDateString('fr-FR', opts);
  if (!endDateStr || endDateStr === dateStr) return start;
  const end = new Date(endDateStr).toLocaleDateString('fr-FR', opts);
  return `${start} → ${end}`;
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export function EventsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Toutes');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/connexion'); return; }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      setEvents((data ?? []) as Event[]);
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  const filtered = useMemo(() => {
    let list = events;
    if (city !== 'Toutes') list = list.filter(e => e.city === city);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, city, search]);

  const groupedByTheme = useMemo(() => {
    const groups = new Map<string, Event[]>();
    for (const e of filtered) {
      const theme = e.theme || 'Autres';
      if (!groups.has(theme)) groups.set(theme, []);
      groups.get(theme)!.push(e);
    }
    // Sort themes alphabetically, but keep "Autres" at the end
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'Autres') return 1;
      if (b === 'Autres') return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  if (!user) return null;

  return (
    <div className="min-h-full bg-[#f7f5ff] pt-3 animate-fade-in">
      <div className="px-5 pb-2">
        <h1 className="sr-only">Événements</h1>
        <label className="sr-only" htmlFor="event-search">Rechercher un événement</label>
        <div className="flex items-center gap-2 rounded-2xl border border-white bg-white px-3 py-2.5 shadow-soft">
          <Search size={16} className="shrink-0 text-primary-600" />
          <input id="event-search" type="search" placeholder="Rechercher un événement…" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-sm text-ink-base placeholder-text-muted outline-none" />
        </div>
      </div>

      {/* City tabs */}
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 py-4">
        {CITIES.map(c => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`shrink-0 rounded-full px-5 py-3 text-[14px] font-semibold transition-colors ${
              city === c
                ? 'bg-primary-600 text-white shadow-lift'
                : 'border border-gold-hairline bg-white text-ink-muted shadow-sm hover:border-primary-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="container-app space-y-8 pb-28 pt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-[28px] bg-white animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
              <Calendar size={28} className="text-primary-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-neutral-900">Aucun événement</h3>
            <p className="mt-1 text-sm text-neutral-500">
              {search ? 'Essayez un autre mot-clé.' : 'De nouveaux événements arrivent chaque semaine.'}
            </p>
          </div>
        ) : (
          <>
            {groupedByTheme.map(([theme, themeEvents]) => (
              <section key={theme}>
                <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-primary-700">
                  {theme} · {themeEvents.length} événement{themeEvents.length > 1 ? 's' : ''}
                </h2>
                <div className="space-y-3">
                  {themeEvents.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}

function EventCard({ event: e, highlight }: { event: Event; highlight?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-[28px] border border-white transition-shadow hover:shadow-lift ${highlight ? 'bg-primary-50/30' : 'bg-white shadow-soft'}`}>
      <div className="flex gap-4 p-4">
        {/* Photo ou placeholder */}
        <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${highlight ? 'bg-primary-100' : 'bg-[#f1eff7]'}`}>
          {e.photo_url ? (
            <img src={e.photo_url} alt={e.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">🏳️‍🌈</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isToday(e.event_date) && (
            <span className="mb-1 inline-block rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Aujourd'hui
            </span>
          )}
          <p className="truncate font-display text-lg font-bold leading-tight text-ink-base">{e.name}</p>

          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary-700">
            <Calendar size={14} />
            {formatDate(e.event_date, e.event_end_date)}
          </p>

          {(e.address || e.city) && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
              <MapPin size={14} />
              <span className="truncate">{e.address ?? e.city}</span>
            </p>
          )}

          {e.description && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink-muted">{e.description}</p>
          )}
        </div>
      </div>

      {e.website_url && (
        <div className="border-t border-gold-hairline px-4 py-3">
          <a
            href={e.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
          >
            <ExternalLink size={12} />
            Voir l'événement
          </a>
        </div>
      )}
    </article>
  );
}
