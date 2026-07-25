import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import type { Resource } from '@/lib/types';
import { FALLBACK_RESOURCES } from '@/lib/resourcesFallback';
import { ArrowLeft, Phone, ExternalLink, Clock, ChevronDown, BookOpen, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResourcesPage() {
  const { navigate } = useRouter();
  const [resources, setResources] = useState<Resource[]>(FALLBACK_RESOURCES);
  const [loading, setLoading] = useState(true);
  const [openGuide, setOpenGuide] = useState<string | null>(null);

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
  }, []);

  const hotlines = resources.filter((r) => r.type === 'numero_utile').sort((a, b) => a.sort_order - b.sort_order);
  const guides = resources.filter((r) => r.type === 'guide').sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-neutral-900 sm:text-3xl">
                Ressources &amp; guides
              </h1>
              <p className="mt-0.5 text-sm text-neutral-500">Vous n'êtes pas seul·e. De l'aide existe, gratuite et confidentielle.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app max-w-2xl py-8 space-y-8">
        {/* Hotlines */}
        <section>
          <h2 className="font-display text-lg font-semibold text-neutral-900">Numéros utiles</h2>
          <p className="mt-1 text-sm text-neutral-500">Des professionnel·le·s et bénévoles formé·e·s, à votre écoute.</p>

          <div className="mt-4 space-y-3">
            {hotlines.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-900">{r.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{r.description}</p>
                    {r.hours && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-400">
                        <Clock size={12} /> {r.hours}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.phone && (
                    <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="btn-primary btn-sm">
                      <Phone size={14} /> {r.phone}
                    </a>
                  )}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                      En savoir plus <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Guides */}
        <section>
          <h2 className="font-display text-lg font-semibold text-neutral-900">Guides</h2>
          <p className="mt-1 text-sm text-neutral-500">Des repères généraux — pas un avis médical ou juridique personnalisé.</p>

          <div className="mt-4 space-y-3">
            {guides.map((g) => {
              const open = openGuide === g.id;
              return (
                <div key={g.id} className="card overflow-hidden">
                  <button
                    onClick={() => setOpenGuide(open ? null : g.id)}
                    className="flex w-full items-start gap-3 p-5 text-left"
                    aria-expanded={open}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900">{g.title}</h3>
                      <p className="mt-1 text-sm text-neutral-500">{g.description}</p>
                    </div>
                    <ChevronDown size={18} className={cn('mt-1 shrink-0 text-neutral-400 transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && g.content && (
                    <div className="border-t border-neutral-100 px-5 py-4">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">{g.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {!loading && (
          <p className="text-center text-xs text-neutral-400">
            Vous gérez une association ou une structure et souhaitez être ajouté·e à cette page ? Contactez l'équipe
            depuis les mentions légales.
          </p>
        )}
      </div>
    </div>
  );
}
