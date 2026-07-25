import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Loaded lazily and cached — loadStripe() itself already memoizes on the
// key, but keeping our own singleton avoids re-triggering Stripe.js's
// script injection logic on every render.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key) {
    // No key configured yet (Stripe account not set up) — paid-service
    // features stay hidden rather than crashing the app.
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
