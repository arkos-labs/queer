// Queer Service — capture or cancel a pending payment
//
// 'capture': the client (payer) confirms the service is finished — only
// then is the card actually charged (funds move to the provider's
// connected account minus the platform fee). The provider can never
// trigger this themselves — they can't pay themselves for their own work.
// 'cancel': either participant cancels — releases the authorization hold
// without charging anything.

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

    const { connection_id, action } = await req.json().catch(() => ({}));
    if (!connection_id || !["capture", "cancel"].includes(action)) {
      return json({ error: "Paramètres invalides." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: payment, error: payErr } = await admin
      .from("payments")
      .select("*")
      .eq("connection_id", connection_id)
      .in("status", ["pending", "authorized"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (payErr) throw payErr;
    if (!payment) return json({ error: "Aucun paiement en attente pour cette mise en relation." }, 404);

    if (action === "capture" && payment.payer_id !== user.id) {
      return json({ error: "Seul·e le·la client·e qui a payé peut confirmer la fin de la prestation et déclencher le paiement." }, 403);
    }
    if (action === "cancel" && payment.payer_id !== user.id && payment.payee_id !== user.id) {
      return json({ error: "Accès refusé." }, 403);
    }

    let newStatus: string;
    if (action === "capture") {
      if (!payment.stripe_payment_intent_id) return json({ error: "Aucune carte autorisée à débiter." }, 400);
      await stripe.paymentIntents.capture(payment.stripe_payment_intent_id);
      newStatus = "captured";
    } else {
      // A payment can still be at the pure price-negotiation stage (no
      // PaymentIntent created yet) — nothing to cancel on Stripe's side,
      // just mark it canceled so a fresh request can be sent.
      if (payment.stripe_payment_intent_id) {
        await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
      }
      newStatus = "canceled";
    }

    const { error: updErr } = await admin
      .from("payments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (updErr) throw updErr;

    return json({ status: newStatus });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, 500);
  }
});
