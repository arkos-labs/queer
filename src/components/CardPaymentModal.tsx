import { useEffect, useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { getStripe } from '@/lib/payments';

interface Props {
  clientSecret: string;
  totalLabel: string;
  onClose: () => void;
  onPaid: () => void;
}

/**
 * Saisie de la carte (Stripe Payment Element). La carte est seulement
 * autorisée : le débit a lieu quand le·la client·e confirme la fin de la prestation.
 */
export function CardPaymentModal({ clientSecret, totalLabel, onClose, onPaid }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let element: { unmount: () => void } | null = null;
    getStripe().then((stripe) => {
      if (cancelled) return;
      if (!stripe) {
        setError('Le paiement n’est pas encore configuré (clé Stripe manquante).');
        return;
      }
      stripeRef.current = stripe;
      const elements = stripe.elements({ clientSecret, locale: 'fr' });
      elementsRef.current = elements;
      const paymentElement = elements.create('payment');
      paymentElement.mount(mountRef.current!);
      paymentElement.on('ready', () => setReady(true));
      element = paymentElement;
    });
    return () => {
      cancelled = true;
      element?.unmount();
    };
  }, [clientSecret]);

  const pay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    const { error: payError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (payError) {
      setError(payError.message ?? 'Le paiement a échoué.');
      setPaying(false);
      return;
    }
    onPaid();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="card-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={paying ? undefined : onClose} />
      <div className="card relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-b-2xl">
        <div className="flex items-center justify-between">
          <h3 id="card-title" className="font-display text-lg font-semibold text-neutral-900">Paiement sécurisé</h3>
          <button onClick={onClose} disabled={paying} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Votre carte est seulement réservée. Elle n’est débitée que lorsque vous confirmez que la prestation est terminée.
        </p>
        <div ref={mountRef} className="mt-4 min-h-[120px]" />
        {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
        <button onClick={pay} disabled={!ready || paying} className="btn-primary mt-5 w-full">
          <Lock size={15} /> {paying ? 'Validation…' : `Réserver ${totalLabel}`}
        </button>
        <p className="mt-3 text-center text-[11px] text-neutral-400">Paiement traité par Stripe — Queer Services ne voit jamais votre carte.</p>
      </div>
    </div>
  );
}
