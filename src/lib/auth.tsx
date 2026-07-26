import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Set the in-memory profile directly from a row you already have (e.g.
   *  the row returned by an upsert's own `.select()`), instead of doing a
   *  second round-trip fetch via refreshProfile. Used right after
   *  onboarding finishes, so the context's `profile` is guaranteed
   *  up to date in the very same tick as the navigate() call that follows
   *  — no window where a route guard could see a stale `profile === null`
   *  and bounce back to /onboarding. */
  setProfile: (profile: Profile) => void;
  /** Dev-only helper to bypass real auth while Supabase isn't wired up yet.
   *  Only ever defined in local dev builds (import.meta.env.DEV) — stripped
   *  out of production builds, never shown to real users. */
  devLogin?: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // emailRedirectTo brings the person back to the app after they click
    // the confirmation link (when "Confirm email" is enabled in Supabase).
    // If Supabase returns a user but no session, confirmation is pending —
    // the caller should show a "check your inbox" screen rather than
    // routing straight into onboarding with no authenticated session.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    return {
      error: error ? error.message : null,
      needsConfirmation: !error && !data.session,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  // Dev-only bypass: lets you click through the app without a real Supabase
  // project configured. Never included in production builds.
  const devLogin = import.meta.env.DEV
    ? () => {
        const fakeUser = { id: 'dev-123', email: 'dev@test.com' } as User;
        const fakeProfile: Profile = {
          id: 'dev-123',
          display_name: 'Développeur',
          email: 'dev@test.com',
          phone: null,
          civilite: null,
          pronouns: null,
          account_type: 'particulier',
          bio: 'Compte de test (mode développement uniquement).',
          photo_url: null,
          city: null,
          skills: [],
          needs: [],
          intervention_zone: null,
          indicative_rates: null,
          budget_indicatif: null,
          charte_accepted: true,
          charte_accepted_at: new Date().toISOString(),
          verification_status: 'none',
          verified_at: null,
          identity_document_path: null,
          profile_status: 'active',
          is_admin: true,
          stripe_account_id: null,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSession({ user: fakeUser, access_token: 'fake', refresh_token: 'fake' } as Session);
        setUser(fakeUser);
        setProfile(fakeProfile);
      }
    : undefined;

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile, setProfile, devLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
