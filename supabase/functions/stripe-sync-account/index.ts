// Queer Service — sync a provider's Stripe Connect status on demand
//
// This Stripe test environment runs on the newer Accounts v2 API, whose
// webhook events (v2.core.account[...].capability_status_updated) use a
// different shape/routing than the classic `account.updated` event our
// stripe-webhook function listens for. Rather than chase that mismatch,
// this function does a direct pull: fetch the account from Stripe and
// write charges_enabled/payouts_enabled straight into the profile. The
// frontend calls this right when the member lands back from the Stripe
// onboarding flow (?stripe=return), so the badge is correct immediately
// instead of waiting on a webhook that may not arrive in this shape.

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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, stripe_account_id")
      .eq("id", user.id)
      .single();
    if (profErr || !profile) return json({ error: "Profil introuvable." }, 404);
    if (!profile.stripe_account_id) return json({ charges_enabled: false, payouts_enabled: false });

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const { error: updErr } = await admin
      .from("profiles")
      .update({
        stripe_charges_enabled: !!account.charges_enabled,
        stripe_payouts_enabled: !!account.payouts_enabled,
      })
      .eq("id", profile.id);
    if (updErr) throw updErr;

    return json({ charges_enabled: !!account.charges_enabled, payouts_enabled: !!account.payouts_enabled });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, 500);
  }
});
