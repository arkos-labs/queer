import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { X, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';

// Card-entry modal shown from a conversation once the provider has
// accepted the mission — this is deliberately the only place a client
// can be asked for card details. See stripe-create-payment: it refuses
// to issue a PaymentIntent for a connection that isn't 'accepted' yet.
export function PayNowModal({
  clientSecret,
  connectionId,
  onClose,
  onDone,
}: {
  clientSecret: string;
  connectionId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pay-now-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md animate-scale-in p-6">
        <div className="flex items-center justify-between">
          <h3 id="pay-now-title" className="font-display text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <CreditCard size={18} className="text-primary-600" /> Payer la mission
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <Elements stripe={getStripe()} options={{ clientSecret }}>
          <CheckoutStep connectionId={connectionId} onDone={onDone} />
        </Elements>
      </div>
    </div>
  );
}

function CheckoutStep({ connectionId, onDone }: { connectionId: string; onDone: () => void }) {
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
        Paiement sécurisé par Stripe. Votre carte est autorisée maintenant, débitée seulement quand vous confirmerez
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
          {submitting ? 'Autorisation…' : 'Autoriser le paiement'}
        </button>
      </div>
    </div>
  );
}
