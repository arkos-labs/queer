// Queer Service — create a payment REQUEST on a connection
//
// This only records a pending price in the payments table — it never
// talks to Stripe and never asks for a card. The client cannot be asked
// for card details until the provider has explicitly accepted the
// mission (see stripe-create-payment, which is the function that
// actually issues a PaymentIntent, and which refuses to run unless the
// connection is 'accepted').

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié." }, 401);

    const { connection_id, amount, description, scheduled_at, service_date, service_time, service_location, role } = await req.json().catch(() => ({}));
    if (!connection_id || typeof amount !== "number" || !Number.isFinite(amount) || amount < 100) {
      return json({ error: "Paramètres invalides (montant minimum 1€)." }, 400);
    }
    // Who's proposing the price isn't always who's paying: on a profile
    // "quote request" the caller is the client requesting to pay someone
    // (role: 'payer', the default). On a mission application, the caller
    // is the provider proposing their own rate for the mission poster to
    // pay (role: 'payee') — same negotiation flow, opposite direction.
    const callerIsPayee = role === "payee";
    let scheduledAtIso: string | null = null;
    if (scheduled_at) {
      const d = new Date(scheduled_at);
      if (Number.isNaN(d.getTime())) return json({ error: "Date de prestation invalide." }, 400);
      scheduledAtIso = d.toISOString();
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: connection, error: connErr } = await admin
      .from("connections")
      .select("id, user_a, user_b")
      .eq("id", connection_id)
      .single();
    if (connErr || !connection) return json({ error: "Mise en relation introuvable." }, 404);
    if (connection.user_a !== user.id && connection.user_b !== user.id) {
      return json({ error: "Accès refusé." }, 403);
    }

    const otherPartyId = connection.user_a === user.id ? connection.user_b : connection.user_a;
    const payerId = callerIsPayee ? otherPartyId : user.id;
    const payeeId = callerIsPayee ? user.id : otherPartyId;

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("charte_accepted, profile_status")
      .eq("id", user.id)
      .single();
    if (!callerProfile?.charte_accepted || callerProfile.profile_status !== "active") {
      return json({ error: "Acceptez la charte de respect depuis votre profil avant de demander un service payant." }, 403);
    }

    // Whoever will receive the money (the payee) needs Stripe payouts
    // enabled, regardless of which side of the conversation proposed the
    // price.
    const { data: payeeProfile, error: payeeErr } = await admin
      .from("profiles")
      .select("id, display_name, stripe_account_id, stripe_charges_enabled")
      .eq("id", payeeId)
      .single();
    if (payeeErr || !payeeProfile) return json({ error: "Prestataire introuvable." }, 404);
    if (!payeeProfile.stripe_account_id || !payeeProfile.stripe_charges_enabled) {
      return json(
        {
          error: callerIsPayee
            ? "Activez les paiements en ligne depuis vos réglages pour pouvoir proposer un tarif payant."
            : `${payeeProfile.display_name} n'a pas encore activé les paiements.`,
        },
        400,
      );
    }

    // Don't stack a second pending request on top of one that's already
    // awaiting acceptance or payment for this connection.
    const { data: existing } = await admin
      .from("payments")
      .select("id, status")
      .eq("connection_id", connection_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && (existing.status === "pending" || existing.status === "authorized")) {
      return json({ error: "Une demande de paiement est déjà en cours pour cette conversation." }, 400);
    }

    const feePercent = Number(Deno.env.get("PLATFORM_FEE_PERCENT") ?? "10");
    const amountCents = Math.round(amount);
    const platformFee = Math.round((amountCents * feePercent) / 100);
    const safeDescription = description ? String(description).slice(0, 200) : null;

    const { data: payment, error: payErr } = await admin
      .from("payments")
      .insert({
        connection_id,
        payer_id: payerId,
        payee_id: payeeId,
        description: safeDescription,
        amount: amountCents,
        platform_fee_amount: platformFee,
        stripe_payment_intent_id: null,
        status: "pending",
        proposed_by: user.id,
        scheduled_at: scheduledAtIso,
        service_date: service_date || null,
        service_time: service_time || null,
        service_location: service_location || null,
      })
      .select()
      .single();
    if (payErr) throw payErr;

    // A fresh proposal always starts a new negotiation round. If the
    // connection was left 'cancelled' (previous offer refused/canceled) or
    // 'completed' (a prior, separate deal on the same thread), it needs to
    // go back to 'pending' — otherwise the client only shows accept/
    // refuse/counter actions when connectionStatus === 'pending', and this
    // brand new payment would render with no actions at all because the
    // connection's status was still stuck on the previous round's outcome.
    const { data: connRow } = await admin
      .from("connections")
      .select("status")
      .eq("id", connection_id)
      .single();
    if (connRow && (connRow.status === "cancelled" || connRow.status === "completed")) {
      await admin
        .from("connections")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", connection_id);
    }

    return json({ payment_id: payment.id });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Erreur inconnue.";
    return json({ error: message }, 500);
  }
});
