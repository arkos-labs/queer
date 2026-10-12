import { useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { PublicDirectoryListing } from '@/lib/types';
import { ArrowLeft, Building2, LogIn, MapPin, ShieldCheck, Star, Users } from 'lucide-react';

// Logged-out view of a member: browsing results and their summary needs no
// account (App Store guideline 5.1.1(v)). Backed by the anonymized
// public_directory_listings view — never the real `profiles` table — so no
// name, photo, bio or contact detail is exposed. Contacting a member is the
// only account-based action, and it is clearly labelled as such.
export function PublicProfilePreview({ id }: { id: string }) {
  const { navigate } = useRouter();
  const [listing, setListing] = useState<PublicDirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('public_directory_listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      setListing((data as PublicDirectoryListing | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container-app py-16">
        <div className="card h-96 animate-pulse bg-neutral-100" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-ink-base">Profil introuvable</h2>
        <p className="mt-2 text-ink-muted">Ce membre n'existe plus ou n'est pas accessible.</p>
        <button
          onClick={() => navigate('/annuaire')}
          className="mx-auto mt-6 flex items-center justify-center rounded-xl bg-ink-base px-6 py-2.5 font-semibold text-white shadow-soft"
        >
          Retour à l'annuaire
        </button>
      </div>
    );
  }

  const TypeIcon = listing.account_type === 'pro' ? Building2 : Users;
  const typeLabel = listing.account_type === 'pro' ? 'Professionnel·le / entreprise' : 'Particulier·e';

  return (
    <div className="animate-fade-in container-app pb-6 pt-0">

      <div className="rounded-3xl border border-gold-hairline bg-white/60 p-8 text-center shadow-soft backdrop-blur-sm">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-gold-hairline bg-paper-base text-3xl font-bold uppercase text-ink-muted">
          {listing.display_initial}
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold-hairline bg-paper-base px-3 py-1 text-xs font-semibold text-ink-base shadow-sm">
          <TypeIcon size={13} /> {typeLabel}
        </span>

        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-ink-muted">
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {listing.city || 'Partout'}
          </span>
          <span className="flex items-center gap-1 font-bold text-ink-base">
            <Star size={14} className="fill-[#D4AF37] text-[#D4AF37]" />
            {listing.avg_rating > 0 ? (
              <>
                {listing.avg_rating.toFixed(1)}{' '}
                <span className="font-normal text-ink-muted">({listing.review_count} avis)</span>
              </>
            ) : (
              <span className="font-normal">Pas encore d'avis</span>
            )}
          </span>
        </div>

        {listing.skills.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {listing.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-gold-hairline bg-white px-3 py-1 text-xs font-medium text-ink-base shadow-sm"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gold-hairline bg-paper-base p-5 text-center">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Pour contacter ce membre, voir son profil complet et ses avis, créez un compte gratuit.
          Vous pouvez continuer à parcourir l'annuaire sans compte.
        </p>
        <button
          onClick={() => navigate('/inscription')}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-patina-deep px-4 py-3 text-[15px] font-semibold text-white shadow-sm hover:brightness-110"
        >
          <LogIn size={18} /> Créer un compte pour contacter
        </button>
        <button
          onClick={() => navigate('/annuaire')}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-patina-deep"
        >
          Continuer à parcourir l'annuaire
        </button>
      </div>
    </div>
  );
}
