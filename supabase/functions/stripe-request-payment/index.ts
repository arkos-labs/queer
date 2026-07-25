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

    const { connection_id, amount, description, scheduled_at, service_date, service_time, service_location } = await req.json().catch(() => ({}));
    if (!connection_id || typeof amount !== "number" || !Number.isFinite(amount) || amount < 100) {
      return json({ error: "Paramètres invalides (montant minimum 1€)." }, 400);
    }
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

    const payeeId = connection.user_a === user.id ? connection.user_b : connection.user_a;

    const { data: payerProfile } = await admin
      .from("profiles")
      .select("charte_accepted, profile_status")
      .eq("id", user.id)
      .single();
    if (!payerProfile?.charte_accepted || payerProfile.profile_status !== "active") {
      return json({ error: "Acceptez la charte de respect depuis votre profil avant de demander un service payant." }, 403);
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
        payer_id: user.id,
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

    // Send a system message to trigger notifications for the recipient
    await admin.from("messages").insert({
      connection_id,
      sender_id: user.id,
      body: `J'ai envoyé une proposition de prix de ${(amountCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}.`,
    });

    return json({ payment_id: payment.id });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, 500);
  }
});
