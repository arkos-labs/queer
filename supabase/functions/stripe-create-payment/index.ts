// Queer Service — issue the PaymentIntent for an already-requested payment
//
// This is the only place a client is ever asked for card details, and it
// deliberately refuses to run until the provider has accepted the
// mission (connection.status === 'accepted'). Before that, stripe-request-
// payment has already recorded a pending amount/description — this
// function looks that row up and attaches a real Stripe PaymentIntent to
// it. Uses a Stripe Connect destination charge: the platform commission
// is taken via application_fee_amount, the rest goes straight to the
// provider's own connected account. capture_method is 'manual' so the
// card is only actually charged once the client (payer) confirms the
// service is finished (see stripe-manage-payment).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@^18";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié." }, 401);

    const { connection_id } = await req.json().catch(() => ({}));
    if (!connection_id) return json({ error: "Paramètres invalides." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: connection, error: connErr } = await admin
      .from("connections")
      .select("id, user_a, user_b, status")
      .eq("id", connection_id)
      .single();
    if (connErr || !connection) return json({ error: "Mise en relation introuvable." }, 404);
    if (connection.user_a !== user.id && connection.user_b !== user.id) {
      return json({ error: "Accès refusé." }, 403);
    }
    // A client can never be asked for card details before the provider
    // has accepted the mission.
    if (connection.status !== "accepted") {
      return json({ error: "Le·la prestataire doit d'abord accepter la mission avant que vous puissiez payer." }, 400);
    }

    const payeeId = connection.user_a === user.id ? connection.user_b : connection.user_a;

    const { data: payerProfile } = await admin
      .from("profiles")
      .select("charte_accepted, profile_status")
      .eq("id", user.id)
      .single();
    if (!payerProfile?.charte_accepted || payerProfile.profile_status !== "active") {
      return json({ error: "Acceptez la charte de respect depuis votre profil avant de payer un service." }, 403);
    }

    const { data: payeeProfile, error: payeeErr } = await admin
      .from("profiles")
      .select("id, display_name, stripe_account_id, stripe_charges_enabled")
      .eq("id", payeeId)
      .single();
    if (payeeErr || !payeeProfile) return json({ error: "Prestataire introuvable." }, 404);
    if (!payeeProfile.stripe_account_id || !payeeProfile.stripe_charges_enabled) {
      return json({ error: `${payeeProfile.display_name} n'a pas encore activé les paiements.` }, 400);
    }

    // Find the pending payment request created by stripe-request-payment —
    // that's where the amount/description live. We only attach a
    // PaymentIntent to it here, never create a new row.
    const { data: pendingPayment, error: pendingErr } = await admin
      .from("payments")
      .select("*")
      .eq("connection_id", connection_id)
      .eq("payer_id", user.id)
      .eq("status", "pending")
      .is("stripe_payment_intent_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingErr) throw pendingErr;
    if (!pendingPayment) return json({ error: "Aucune demande de paiement en attente pour cette conversation." }, 404);

    // The negotiated price (pendingPayment.amount) is what the provider
    // agreed to be paid — the platform's cut must not come out of that.
    // So the client is charged the negotiated price PLUS the platform
    // fee on top; application_fee_amount (= the fee) is what Stripe Connect
    // keeps for the platform, and a destination charge automatically
    // transfers `amount - application_fee_amount` to the connected
    // account, which works out to exactly the negotiated price, in full,
    // for the provider.
    const totalChargeAmount = pendingPayment.amount + pendingPayment.platform_fee_amount;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeAmount,
      currency: "eur",
      capture_method: "manual",
      application_fee_amount: pendingPayment.platform_fee_amount,
      transfer_data: { destination: payeeProfile.stripe_account_id },
      automatic_payment_methods: { enabled: true },
      metadata: { connection_id, payer_id: user.id, payee_id: payeeId },
      description: pendingPayment.description ?? undefined,
    });

    const { data: payment, error: payErr } = await admin
      .from("payments")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", pendingPayment.id)
      .select()
      .single();
    if (payErr) throw payErr;

    return json({ client_secret: paymentIntent.client_secret, payment_id: payment.id });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, 500);
  }
});
