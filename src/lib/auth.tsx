import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? error.message : null };
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
          siret: null,
          service_category: null,
          intervention_zone: null,
          indicative_rates: null,
          charte_accepted: true,
          charte_accepted_at: new Date().toISOString(),
          verification_status: 'none',
          verified_at: null,
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
      value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile, devLogin }}
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
