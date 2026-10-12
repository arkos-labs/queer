import { useRealtimeRevision } from '@/lib/realtime';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import type { Resource } from '@/lib/types';
import { FALLBACK_RESOURCES } from '@/lib/resourcesFallback';
import { Phone, ExternalLink, Clock, ChevronDown, BookOpen, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function ResourcesPage() {
  const liveRevision = useRealtimeRevision('resources');
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>(FALLBACK_RESOURCES);
  const [loading, setLoading] = useState(true);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [contactingSupport, setContactingSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactSupport = async () => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    setContactingSupport(true);
    setError(null);
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .maybeSingle();

      if (adminErr || !adminData) {
        throw new Error('Impossible de trouver un administrateur à contacter.');
      }
      
      const adminId = adminData.id;
      if (adminId === user.id) {
        throw new Error('Vous êtes déjà administrateur.');
      }

      const { data: existing, error: findErr } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user_a.eq.${user.id},user_b.eq.${adminId}),and(user_a.eq.${adminId},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) throw findErr;

      let connId = existing?.id;
      if (!connId) {
        const { data: created, error: createErr } = await supabase
          .from('connections')
          .insert({
            user_a: user.id,
            user_b: adminId,
            service_label: 'Support Queer Service',
            status: 'accepted',
          })
          .select('id')
          .single();
        if (createErr) throw createErr;
        connId = created.id;
      }
      
      navigate(`/messages/${connId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setContactingSupport(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await supabase.from('resources').select('*').order('type').order('sort_order');
        if (cancelled) return;
        if (!res.error && res.data?.length) {
          setResources(res.data as Resource[]);
        }
      } catch {
        // keep the local fallback — support resources must never disappear
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liveRevision]);

  const hotlines = resources.filter((r) => r.type === 'numero_utile').sort((a, b) => a.sort_order - b.sort_order);
  const guides = resources.filter((r) => r.type === 'guide').sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="animate-fade-in bg-paper-base pb-28">
      <div className="container-app max-w-xl pt-2">
        <h1 className="font-display text-3xl font-bold text-ink-base">Infos pratiques</h1>
        <p className="mt-1 text-[15px] leading-snug text-ink-muted">Vous n'êtes pas seul·e. De l'aide existe, gratuite et confidentielle.</p>
      </div>

      <div className="container-app max-w-xl space-y-8 py-6">
        {/* Numéros utiles */}
        <section>
          <p className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">Numéros utiles</p>
          <div className="space-y-3">
            {hotlines.map((r) => (
              <div key={r.id} className="rounded-3xl border border-white bg-white p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success-50 text-success-600">
                    <Phone size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-bold leading-tight text-ink-base">{r.title}</h3>
                    <p className="mt-1 text-[13px] leading-snug text-ink-muted">{r.description}</p>
                    {r.hours && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper-base px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                        <Clock size={12} /> {r.hours}
                      </p>
                    )}
                  </div>
                </div>
                {(r.phone || r.url) && (
                  <div className="mt-3 flex gap-2">
                    {r.phone && (
                      <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-[15px] font-bold text-white active:scale-[0.98] transition-transform">
                        <Phone size={16} /> {r.phone}
                      </a>
                    )}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Site web" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold-hairline bg-white text-ink-base active:scale-95 transition-transform">
                        <ExternalLink size={17} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Guides */}
        <section>
          <p className="mb-1 px-1 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">Guides</p>
          <p className="mb-2 px-1 text-[12px] text-ink-muted">Des repères généraux, pas un avis médical ou juridique personnalisé.</p>
          <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-soft">
            {guides.map((g) => {
              const open = openGuide === g.id;
              return (
                <div key={g.id} className="border-b border-neutral-100 last:border-0">
                  <button
                    onClick={() => setOpenGuide(open ? null : g.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-neutral-50"
                    aria-expanded={open}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                      <BookOpen size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-tight text-ink-base">{g.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{g.description}</span>
                    </span>
                    <ChevronDown size={18} className={cn('shrink-0 text-neutral-300 transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && g.content && (
                    <div className="bg-paper-base/60 px-4 pb-4 pt-3">
                      <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-muted">{g.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {!loading && (
          <section>
            <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-soft">
              <button
                onClick={contactSupport}
                disabled={contactingSupport}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-neutral-50 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <MessageCircle size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink-base">{contactingSupport ? 'Ouverture…' : 'Contacter l’équipe'}</span>
                  <span className="block text-[12px] text-ink-muted">Question, problème technique, association à ajouter</span>
                </span>
              </button>
            </div>
            {error && <p className="mt-3 px-1 text-sm text-error-600">{error}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
