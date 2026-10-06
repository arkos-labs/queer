import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useRealtimeTick } from '@/lib/realtime';
import type { Event } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Calendar, MapPin, ExternalLink, Search, X, Plus, CheckCircle2, Users } from 'lucide-react';

const CITIES = ['Toutes', 'Paris', 'Marseille', 'Lyon', 'Bordeaux', 'Toulouse', 'Nice', 'Nantes', 'Montpellier'];

function formatDate(dateStr: string, endDateStr?: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const start = new Date(dateStr).toLocaleDateString('fr-FR', opts);
  if (!endDateStr || endDateStr === dateStr) return start;
  const end = new Date(endDateStr).toLocaleDateString('fr-FR', opts);
  return `${start} → ${end}`;
}

interface Attendee {
  profile_id: string;
  display_name: string;
  photo_url: string | null;
  company_name: string | null;
  account_type: string;
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export function EventsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const rtTick = useRealtimeTick(['events', 'event_attendees']);
  const [selected, setSelected] = useState<Event | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [attendees, setAttendees] = useState<Record<string, Attendee[]>>({});
  const [busyEvent, setBusyEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/connexion'); return; }
    const load = async () => {
      if (rtTick === 0) setLoading(true);
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      const list = (data ?? []) as Event[];
      setEvents(list);
      setLoading(false);

      // Qui y va ? (membres connectés uniquement, hors personnes bloquées)
      if (list.length && user) {
        const [attRes, blocksRes] = await Promise.all([
          supabase
            .from('event_attendees')
            .select('event_id, profile_id, profile:profiles(display_name, photo_url, company_name, account_type)')
            .in('event_id', list.map((e) => e.id)),
          supabase.from('blocked_users').select('blocker_id, blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
        ]);
        const hidden = new Set((blocksRes.data ?? []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id)));
        const byEvent: Record<string, Attendee[]> = {};
        for (const row of (attRes.data ?? []) as unknown as { event_id: string; profile_id: string; profile: Omit<Attendee, 'profile_id'> | null }[]) {
          if (!row.profile || hidden.has(row.profile_id)) continue;
          (byEvent[row.event_id] ??= []).push({ profile_id: row.profile_id, ...row.profile });
        }
        setAttendees(byEvent);
      } else {
        setAttendees({});
      }
    };
    load();
  }, [user, navigate, rtTick]);

  const toggleGoing = async (eventId: string) => {
    if (!user || busyEvent) return;
    setBusyEvent(eventId);
    const going = (attendees[eventId] ?? []).some((a) => a.profile_id === user.id);
    if (going) {
      await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('profile_id', user.id);
    } else {
      await supabase.from('event_attendees').insert({ event_id: eventId, profile_id: user.id });
    }
    const { data } = await supabase
      .from('event_attendees')
      .select('profile_id, profile:profiles(display_name, photo_url, company_name, account_type)')
      .eq('event_id', eventId);
    const rows = ((data ?? []) as unknown as { profile_id: string; profile: Omit<Attendee, 'profile_id'> | null }[])
      .filter((r) => r.profile)
      .map((r) => ({ profile_id: r.profile_id, ...r.profile! }));
    setAttendees((prev) => ({ ...prev, [eventId]: rows }));
    setBusyEvent(null);
  };

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

      <div className="px-5 pt-1">
        <button
          onClick={() => setSuggestOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 active:scale-[0.99]"
        >
          <Plus size={16} /> Proposer un événement
        </button>
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
                  {themeEvents.map(e => <EventCard key={e.id} event={e} count={(attendees[e.id] ?? []).length} going={(attendees[e.id] ?? []).some((a) => a.profile_id === user.id)} onOpen={() => setSelected(e)} />)}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {selected && (
        <EventDetailModal
          event={selected}
          attendees={attendees[selected.id] ?? []}
          userId={user.id}
          busy={busyEvent === selected.id}
          onToggle={() => toggleGoing(selected.id)}
          onOpenProfile={(id) => navigate(`/profil/${id}`)}
          onClose={() => setSelected(null)}
        />
      )}
      {suggestOpen && user && (
        <SuggestEventModal
          userId={user.id}
          onClose={() => setSuggestOpen(false)}
        />
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}

function EventCard({ event: e, highlight, count, going, onOpen }: { event: Event; highlight?: boolean; count: number; going: boolean; onOpen: () => void }) {
  return (
    <article className={`overflow-hidden rounded-[28px] border border-white transition-shadow hover:shadow-lift ${highlight ? 'bg-primary-50/30' : 'bg-white shadow-soft'}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen(); } }}
        className="flex cursor-pointer gap-4 p-4"
      >
        {/* Photo ou placeholder */}
        <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${highlight ? 'bg-primary-100' : 'bg-[#f1eff7]'}`}>
          {e.photo_url ? (
            <img src={e.photo_url} alt={e.name} className="h-full w-full object-cover" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600"><Calendar size={30} /></div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isToday(e.event_date) && (
            <span className="mb-1 inline-block rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Aujourd'hui
            </span>
          )}
          <p className="break-words font-display text-lg font-bold leading-tight text-ink-base">{e.name}</p>

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

          {(count > 0 || going) && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
              <Users size={12} /> {going ? (count > 1 ? `Vous et ${count - 1} autre${count > 2 ? 's' : ''} y allez` : 'Vous y allez') : `${count} membre${count > 1 ? 's' : ''} y vont`}
            </p>
          )}
        </div>
      </div>

      {e.website_url && (
        <div className="border-t border-gold-hairline px-4 py-3">
          <a
            href={e.website_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(ev) => ev.stopPropagation()}
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

function EventDetailModal({
  event: e,
  attendees,
  userId,
  busy,
  onToggle,
  onOpenProfile,
  onClose,
}: {
  event: Event;
  attendees: Attendee[];
  userId: string;
  busy: boolean;
  onToggle: () => void;
  onOpenProfile: (id: string) => void;
  onClose: () => void;
}) {
  const going = attendees.some((a) => a.profile_id === userId);
  const others = attendees.filter((a) => a.profile_id !== userId);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={e.name}
        onClick={(ev) => ev.stopPropagation()}
        className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-lift animate-slide-up sm:rounded-[28px]"
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-base shadow-soft"
        >
          <X size={20} />
        </button>

        {e.photo_url ? (
          <img src={e.photo_url} alt={e.name} className="h-52 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600"><Calendar size={48} /></div>
        )}

        <div className="space-y-3 px-5 pt-5">
          {e.theme && (
            <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-700">
              {e.theme}
            </span>
          )}
          <h2 className="break-words font-display text-2xl font-bold leading-tight text-ink-base">{e.name}</h2>

          <p className="flex items-start gap-2 text-sm font-semibold text-primary-700">
            <Calendar size={16} className="mt-0.5 shrink-0" />
            {formatDate(e.event_date, e.event_end_date)}
          </p>
          {(e.address || e.city) && (
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span className="break-words">{[e.address, e.city].filter(Boolean).join(', ')}</span>
            </p>
          )}

          <div className="border-t border-gold-hairline pt-3">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Description</h3>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-base">
              {e.description?.trim() || "Pas de description pour l'instant."}
            </p>
          </div>

          <div className="border-t border-gold-hairline pt-3">
            <button
              onClick={onToggle}
              disabled={busy}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-bold transition-transform active:scale-[0.98] disabled:opacity-60 ${
                going ? 'border border-success-200 bg-success-50 text-success-700' : 'bg-primary-600 text-white'
              }`}
            >
              {going ? <><CheckCircle2 size={18} /> Vous y allez · Annuler</> : <><Users size={18} /> Je vais à cet événement</>}
            </button>
            <p className="mt-1.5 text-center text-[11px] text-ink-muted">
              Les autres membres connectés pourront le voir et vous contacter pour s'organiser.
            </p>
          </div>

          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">
              {attendees.length > 0 ? `${attendees.length} membre${attendees.length > 1 ? 's' : ''} y vont` : 'Qui y va ?'}
            </h3>
            {others.length === 0 ? (
              <p className="mt-1.5 text-sm text-ink-muted">
                {going ? 'Vous êtes le premier ou la première à y aller.' : 'Personne ne s’est encore signalé. Soyez le premier ou la première !'}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {others.map((a) => (
                  <li key={a.profile_id}>
                    <button
                      onClick={() => onOpenProfile(a.profile_id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gold-hairline bg-white px-3 py-2 text-left active:bg-neutral-50"
                    >
                      <Avatar name={a.display_name} src={a.photo_url} size={40} className="border border-gold-hairline bg-paper-base text-ink-muted" />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-base">
                        {a.account_type === 'pro' && a.company_name ? a.company_name : a.display_name}
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold text-primary-700">Contacter</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {e.website_url && (
            <a
              href={e.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline mt-1 flex w-full items-center justify-center gap-2"
            >
              <ExternalLink size={16} /> Voir l'événement
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const SUGGEST_CITIES = CITIES.filter((c) => c !== 'Toutes');

function SuggestEventModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', city: 'Paris', address: '', event_date: '', description: '', website_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.event_date || !form.description.trim()) {
      setError('Renseignez le nom, la date et une description.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('event_submissions').insert({
      submitted_by: userId,
      kind: 'suggestion',
      status: 'pending',
      name: form.name.trim(),
      city: form.city,
      address: form.address.trim() || null,
      event_date: form.event_date,
      description: form.description.trim(),
      website_url: form.website_url.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Proposer un événement"
        onClick={(ev) => ev.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-5 shadow-lift animate-slide-up sm:rounded-[28px]"
      >
        <button onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-ink-base">
          <X size={20} />
        </button>
        <h2 className="pr-10 font-display text-xl font-bold text-ink-base">Proposer un événement</h2>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-success-600" />
            <p className="mt-3 font-semibold text-ink-base">Merci, votre proposition est envoyée !</p>
            <p className="mt-1 text-sm text-ink-muted">
              Notre équipe la vérifie avant de la publier dans l'agenda.
            </p>
            <button onClick={onClose} className="btn-primary mt-5">Fermer</button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="ev-name">Nom de l'événement</label>
              <input id="ev-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="ev-city">Ville</label>
                <select id="ev-city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  {SUGGEST_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ev-date">Date</label>
                <input id="ev-date" type="date" className="input" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="ev-address">Adresse (facultatif)</label>
              <input id="ev-address" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ev-desc">Description</label>
              <textarea id="ev-desc" rows={4} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ev-url">Lien (facultatif)</label>
              <input id="ev-url" type="url" inputMode="url" className="input" placeholder="https://…" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            </div>

            {error && <p className="rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</p>}

            <button onClick={submit} disabled={saving} className="btn-primary w-full">
              {saving ? 'Envoi…' : 'Envoyer ma proposition'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
