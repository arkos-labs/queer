// Queer Service — counter-offer on a pending price request
//
// Vinted-style negotiation: whoever didn't make the last offer can
// propose a different price for the same connection. Only touches a
// payment row that's still 'pending' with no PaymentIntent attached yet
// — once a card has been authorized the price is locked and must be
// cancelled/re-requested instead of silently changed underneath it.

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

    const { connection_id, amount, description } = await req.json().catch(() => ({}));
    if (!connection_id || typeof amount !== "number" || !Number.isFinite(amount) || amount < 100) {
      return json({ error: "Paramètres invalides (montant minimum 1€)." }, 400);
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

    const { data: payment, error: payFindErr } = await admin
      .from("payments")
      .select("*")
      .eq("connection_id", connection_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (payFindErr) throw payFindErr;
    if (!payment) return json({ error: "Aucune demande de paiement à contre-proposer." }, 404);
    if (payment.status !== "pending" || payment.stripe_payment_intent_id) {
      return json({ error: "Ce prix ne peut plus être modifié." }, 400);
    }
    if (payment.proposed_by === user.id) {
      return json({ error: "En attente de la réponse de l'autre personne avant de proposer un nouveau prix." }, 400);
    }

    const feePercent = Number(Deno.env.get("PLATFORM_FEE_PERCENT") ?? "10");
    const amountCents = Math.round(amount);
    const platformFee = Math.round((amountCents * feePercent) / 100);
    const safeDescription = description ? String(description).slice(0, 200) : payment.description;

    const { data: updated, error: updErr } = await admin
      .from("payments")
      .update({
        amount: amountCents,
        platform_fee_amount: platformFee,
        description: safeDescription,
        proposed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .select()
      .single();
    if (updErr) throw updErr;

    return json({ payment: updated });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Erreur inconnue.";
    return json({ error: message }, 500);
  }
});
