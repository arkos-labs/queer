import { createClient, FunctionsHttpError } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://dummy.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Columns safe to fetch when looking at ANOTHER member's profile (directory,
// message threads, mission applicants, conversation lists, etc.). The
// profiles table's RLS lets any authenticated member read any row (needed
// for the directory to work), so it's on every query to not pull more than
// it needs — deliberately excludes stripe_account_id and
// identity_document_path (payment-account identifier and private ID
// document reference: only ever needed by the profile's own owner, in
// Settings, or by an admin reviewing verification) and is_admin (no
// legitimate use outside admin tooling). stripe_charges_enabled is kept
// because the UI needs it to know whether that member can accept payments.
// Use `select('*')` only when loading your OWN profile (auth.tsx,
// SettingsPage) or in AdminPage, which both have a real need for every field.
export const PUBLIC_PROFILE_COLUMNS =
  'id, display_name, email, phone, civilite, pronouns, account_type, bio, photo_url, city, skills, needs, intervention_zone, indicative_rates, budget_indicatif, charte_accepted, charte_accepted_at, verification_status, verified_at, profile_status, stripe_charges_enabled, created_at, updated_at';

// supabase.functions.invoke() sets `data` to null on any non-2xx response
// and collapses the real error into a generic "Edge Function returned a
// non-2xx status code" — the actual JSON body our functions return (with
// a proper French `error` message) only lives on error.context, which
// has to be read and parsed separately. Every call site should route its
// error through this helper instead of reading `error.message` directly.
export async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === 'string') return body.error;
    } catch {
      // response wasn't JSON — fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : fallback;
}

// IMPORTANT: a Response body can only be read once (`.json()`/`.text()`
// consumes the stream). This only ever checks the HTTP status code, never
// the body — a second read (e.g. by edgeFunctionErrorMessage afterwards)
// would otherwise throw and mask the real error behind the SDK's generic
// "Edge Function returned a non-2xx status code" fallback.
function isAuthErrorResponse(error: unknown): boolean {
  return error instanceof FunctionsHttpError && error.context?.status === 401;
}

// Edge Functions that require a user session (payment requests, counter-
// offers, etc.) occasionally get an access token that's mid-refresh —
// autoRefreshToken swaps it out in the background and functions.invoke()
// can pick up a token that the gateway rejects with 401 "Non authentifié.",
// even though the user is genuinely signed in (their regular table
// queries succeed fine in the same breath). Rather than surface a
// confusing auth error, force a session refresh and retry once before
// giving up — this is the single call site every edge-function invoke
// that needs auth should go through.
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: unknown }> {
  const first = await supabase.functions.invoke<T>(name, { body });
  if (!first.error || !isAuthErrorResponse(first.error)) return first;

  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) return first;

  return supabase.functions.invoke<T>(name, { body });
}
