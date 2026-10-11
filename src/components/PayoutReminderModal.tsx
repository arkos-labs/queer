import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { edgeFunctionErrorMessage, invokeEdgeFunction } from '@/lib/supabase';
import { stripeReturnUrl } from '@/lib/appLinks';

interface Props {
  onClose: () => void;
}

/**
 * Rappel au prestataire : pour être payé, il doit vérifier son identité et son compte
 * bancaire auprès de Stripe (obligation légale). Ouvre la page de vérification Stripe.
 */
export function PayoutReminderModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await invokeEdgeFunction<{ url?: string }>('stripe-connect-onboarding', {
      return_url: stripeReturnUrl('/parametres?stripe=return'),
      refresh_url: stripeReturnUrl('/parametres?stripe=refresh'),
    });
    if (fnError || !data?.url) {
      setError(await edgeFunctionErrorMessage(fnError, 'Impossible d’ouvrir la vérification pour le moment.'));
      setLoading(false);
      return;
    }
    window.location.assign(data.url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="payout-reminder-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="card relative z-10 w-full max-w-sm p-6 text-center">
        <button onClick={onClose} disabled={loading} aria-label="Fermer" className="absolute right-3 top-3 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
          <X size={18} />
        </button>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper-base text-patina-deep">
          <ShieldCheck size={22} />
        </div>
        <h3 id="payout-reminder-title" className="font-display text-lg font-semibold text-neutral-900">
          Vérifiez votre compte pour être payé·e
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          Pour recevoir le paiement de cette prestation, vous devez d’abord vérifier votre identité et votre compte bancaire avec Stripe. C’est obligatoire et ça prend environ 5 minutes.
        </p>
        {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={verify} disabled={loading} className="btn-primary w-full">
            {loading ? 'Ouverture…' : 'Vérifier mon compte maintenant'}
          </button>
          <button onClick={onClose} disabled={loading} className="btn-ghost w-full">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
