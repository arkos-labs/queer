import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { X, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';

const formatEuros = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

// Card-entry modal shown from a conversation once the provider has
// accepted the mission — this is deliberately the only place a client
// can be asked for card details. See stripe-create-payment: it refuses
// to issue a PaymentIntent for a connection that isn't 'accepted' yet.
export function PayNowModal({
  clientSecret,
  connectionId,
  amount,
  feeAmount,
  onClose,
  onDone,
}: {
  clientSecret: string;
  connectionId: string;
  /** The negotiated service price (what the provider will receive in full). */
  amount?: number;
  /** The platform's cut, charged on top of `amount` — never deducted from it. */
  feeAmount?: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const total = typeof amount === 'number' && typeof feeAmount === 'number' ? amount + feeAmount : undefined;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pay-now-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 flex w-full max-w-md animate-scale-in flex-col p-6 max-h-[90vh]">
        <div className="flex shrink-0 items-center justify-between">
          <h3 id="pay-now-title" className="font-display text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <CreditCard size={18} className="text-primary-600" /> Payer la mission
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        {typeof total === 'number' && (
          <div className="mt-3 shrink-0 rounded-xl bg-primary-50 px-4 py-3">
            <div className="flex items-center justify-between text-sm text-primary-600">
              <span>Prix de la prestation</span>
              <span className="font-medium">{formatEuros(amount!)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-primary-600">
              <span>Frais de service</span>
              <span className="font-medium">{formatEuros(feeAmount!)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-primary-200 pt-2">
              <span className="text-sm font-medium text-primary-600">Total à payer</span>
              <span className="text-2xl font-bold text-primary-900">{formatEuros(total)}</span>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <CheckoutStep connectionId={connectionId} amount={total} onDone={onDone} />
          </Elements>
        </div>
      </div>
    </div>
  );
}

function CheckoutStep({ connectionId, amount, onDone }: { connectionId: string; amount?: number; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const base = window.location.origin + window.location.pathname;
    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${base}#/messages/${connectionId}?payment=return`,
      },
    });

    setSubmitting(false);

    if (confirmErr) {
      setError(confirmErr.message ?? 'Le paiement a été refusé.');
      return;
    }

    // Manual-capture intents land on 'requires_capture' once the card is
    // successfully authorized — that's the success state here, not
    // 'succeeded' (which only happens once the mission is confirmed
    // terminated and the payment is captured).
    if (paymentIntent && (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded')) {
      onDone();
    } else {
      setError("Le paiement n'a pas pu être confirmé. Réessayez.");
    }
  };

  return (
    <div className="mt-4">
      <p className="mb-3 flex items-start gap-2 text-xs text-neutral-500">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary-600" />
        Paiement sécurisé. Votre carte est autorisée maintenant, débitée seulement quand vous confirmerez
        que la prestation est terminée.
      </p>
      <PaymentElement />
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <button onClick={confirm} disabled={!stripe || submitting} className="btn-primary">
          {submitting
            ? 'Autorisation…'
            : typeof amount === 'number'
              ? `Autoriser le paiement de ${formatEuros(amount)}`
              : 'Autoriser le paiement'}
        </button>
      </div>
    </div>
  );
}
