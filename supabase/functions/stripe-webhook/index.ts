// Queer Service — Stripe webhook
//
// Source of truth sync: Stripe calls this directly (no user JWT — it's
// verified via the Stripe-Signature header instead, hence verify_jwt is
// disabled for this function specifically). Keeps `payments.status` and
// `profiles.stripe_charges_enabled/payouts_enabled` in sync even if a
// client-triggered call (create-payment / manage-payment) never
// completes — e.g. the browser tab closes mid-checkout.
//
// Two Stripe webhook destinations point here, each with its own signing
// secret: one scoped to "Your account" (payment_intent.* events, which
// live on the platform account) and one scoped to "Connected accounts"
// (account.updated for providers' Express accounts). Stripe signs each
// destination's deliveries with that destination's own secret, so we
// have to try both secrets when verifying.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@^18";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  const secrets = [
    Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
    Deno.env.get("STRIPE_WEBHOOK_SECRET_CONNECT") ?? "",
  ].filter(Boolean);

  let event: Stripe.Event | undefined;
  let lastErr: unknown;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature!, secret, undefined, cryptoProvider);
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!event) {
    console.error("Webhook signature verification failed:", lastErr);
    return new Response(`Webhook Error: ${lastErr instanceof Error ? lastErr.message : "invalid signature"}`, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await admin
          .from("profiles")
          .update({
            stripe_charges_enabled: !!account.charges_enabled,
            stripe_payouts_enabled: !!account.payouts_enabled,
          })
          .eq("stripe_account_id", account.id);
        break;
      }
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from("payments")
          .update({ status: "authorized", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", pi.id)
          .eq("status", "pending");
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from("payments")
          .update({ status: "captured", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from("payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from("payments")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
