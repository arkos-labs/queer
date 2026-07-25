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
