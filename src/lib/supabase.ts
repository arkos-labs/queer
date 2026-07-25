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
