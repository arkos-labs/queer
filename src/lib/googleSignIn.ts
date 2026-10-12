import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '@/lib/supabase';
import { APP_SCHEME } from '@/lib/appLinks';

/** Adresse de retour de l'app après Google : à autoriser dans Supabase → Auth → URL Configuration. */
export const GOOGLE_NATIVE_REDIRECT = `${APP_SCHEME}://auth-callback`;

/**
 * Connexion / inscription avec Google.
 * - Site web : redirection classique, Supabase reprend la session au retour.
 * - App iPhone : page Google dans le navigateur intégré (SFSafariViewController), puis retour
 *   dans l'app par le lien queerservices://auth-callback.
 * Retourne un message d'erreur, ou null (sur le web la page se recharge toute seule).
 */
export async function signInWithGoogle(): Promise<{ error: string | null; cancelled?: boolean }> {
  try {
    if (!Capacitor.isNativePlatform()) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      return { error: error?.message ?? null };
    }

    const { Browser } = await import('@capacitor/browser');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: GOOGLE_NATIVE_REDIRECT, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { error: error?.message ?? 'Impossible de lancer la connexion Google.' };

    return await new Promise((resolve) => {
      let done = false;
      const finish = async (result: { error: string | null; cancelled?: boolean }) => {
        if (done) return;
        done = true;
        (await urlHandle).remove();
        (await closeHandle).remove();
        try { await Browser.close(); } catch { /* déjà fermé */ }
        resolve(result);
      };

      const urlHandle = App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith(GOOGLE_NATIVE_REDIRECT)) return;
        try {
          const parsed = new URL(url);
          const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
          const code = parsed.searchParams.get('code');
          const authError = parsed.searchParams.get('error_description') ?? hash.get('error_description');
          if (authError) return finish({ error: authError });
          if (code) {
            const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
            return finish({ error: exErr?.message ?? null });
          }
          const access_token = hash.get('access_token');
          const refresh_token = hash.get('refresh_token');
          if (access_token && refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
            return finish({ error: setErr?.message ?? null });
          }
          return finish({ error: 'Google n’a pas renvoyé de session.' });
        } catch (e) {
          return finish({ error: e instanceof Error ? e.message : 'La connexion avec Google a échoué.' });
        }
      });
      // L'utilisateur ferme la fenêtre sans terminer : pas une erreur.
      const closeHandle = Browser.addListener('browserFinished', () => {
        window.setTimeout(() => void finish({ error: null, cancelled: true }), 800);
      });

      void Browser.open({ url: data.url, presentationStyle: 'popover' });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'La connexion avec Google a échoué.' };
  }
}
