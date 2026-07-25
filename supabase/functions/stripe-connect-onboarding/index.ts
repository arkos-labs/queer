// Queer Service — Stripe Connect onboarding
//
// Creates (or reuses) a Stripe Express account for the calling member so
// they can receive paid service requests, then returns a fresh Stripe
// account-onboarding link the frontend redirects the user to. Stripe
// itself collects identity/bank details — this app never sees them.

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

    const { return_url, refresh_url } = await req.json().catch(() => ({}));
    if (!return_url || !refresh_url) return json({ error: "return_url et refresh_url requis." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, email, stripe_account_id")
      .eq("id", user.id)
      .single();
    if (profErr || !profile) return json({ error: "Profil introuvable." }, 404);

    let accountId = profile.stripe_account_id as string | null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { profile_id: profile.id },
      });
      accountId = account.id;
      const { error: updErr } = await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", profile.id);
      if (updErr) throw updErr;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    return json({ url: accountLink.url });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, 500);
  }
});
