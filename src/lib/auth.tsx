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
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile?: Profile | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  isPasswordRecovery: boolean;
  finishPasswordRecovery: () => void;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => new URLSearchParams(window.location.search).get('recovery') === '1',
  );

  const loadProfile = async (uid: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) {
        console.error('Error loading profile:', error);
      }
      const p = (data as Profile | null) ?? null;
      setProfile(p);
      return p;
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(null);
      return null;
    }
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
        if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
        setLoading(true);
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

  const signIn = async (email: string, password: string): Promise<{ error: string | null; profile?: Profile | null }> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error: error.message };
    }
    if (data.user) {
      setSession(data.session);
      setUser(data.user);
      const loadedProfile = await loadProfile(data.user.id);
      setLoading(false);
      return { error: null, profile: loadedProfile };
    }
    setLoading(false);
    return { error: null };
  };

  const requestPasswordReset = async (email: string) => {
    const resetUrl = `${window.location.origin}/connexion?recovery=1`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const finishPasswordRecovery = () => setIsPasswordRecovery(false);

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
          linkedin_url: null,
          external_reviews_url: null,
          charte_accepted: true,
          charte_accepted_at: new Date().toISOString(),
          verification_status: 'none',
          verified_at: null,
          identity_document_path: null,
          profile_status: 'active',
          is_admin: true,
          is_community_member: null,
          is_ally: false,
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
      value={{ session, user, profile, loading, signUp, signIn, requestPasswordReset, updatePassword, isPasswordRecovery, finishPasswordRecovery, signOut, refreshProfile, setProfile, devLogin }}
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
