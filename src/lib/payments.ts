import { loadStripe, type Stripe } from '@stripe/stripe-js';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'canceled' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  connection_id: string;
  payer_id: string;
  payee_id: string;
  description: string | null;
  amount: number; // centimes — prix négocié, intégralement reversé au prestataire
  platform_fee_amount: number; // centimes — frais de service, ajoutés au prix pour le client
  stripe_payment_intent_id: string | null;
  status: PaymentStatus;
  proposed_by: string;
  created_at: string;
  updated_at: string;
}

// Commission de la plateforme, retenue sur ce que reçoit le prestataire (le client paie le prix affiché).
// Affichage seulement : le taux appliqué est celui du serveur (stripe-request-payment).
export const PLATFORM_FEE_RATE = 0.062;

export const formatCents = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

let stripePromise: Promise<Stripe | null> | null = null;
/** Charge Stripe.js une seule fois (clé publique : VITE_STRIPE_PUBLISHABLE_KEY). */
export function getStripe(): Promise<Stripe | null> {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key) return Promise.resolve(null);
  stripePromise ??= loadStripe(key);
  return stripePromise;
}
