import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

/** Identifiant de l'app iOS (Bundle ID), à déclarer dans Supabase → Auth → Apple → Client IDs. */
const APPLE_CLIENT_ID = 'com.queerservices.app';

/** Le bouton « Se connecter avec Apple » n'existe que dans l'app iPhone/iPad. */
export const isAppleSignInAvailable = () => Capacitor.getPlatform() === 'ios';

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Connexion native avec Apple : Apple reçoit le nonce haché, Supabase le nonce brut
 * (il le re-hache pour vérifier le jeton). Retourne un message d'erreur, ou null si connecté.
 */
export async function signInWithApple(): Promise<{ error: string | null; cancelled?: boolean }> {
  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    const rawNonce = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const hashedNonce = toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce)));

    const result = await SignInWithApple.authorize({
      clientId: APPLE_CLIENT_ID,
      redirectURI: '',
      scopes: 'email name',
      state: toHex(crypto.getRandomValues(new Uint8Array(8)).buffer),
      nonce: hashedNonce,
    });
    const identityToken = result.response?.identityToken;
    if (!identityToken) return { error: 'Apple n’a pas renvoyé de jeton de connexion.' };

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce,
    });
    if (error) return { error: error.message };

    // Apple ne donne le nom qu'à la toute première connexion : on le garde pour préremplir le profil.
    const given = result.response?.givenName;
    const family = result.response?.familyName;
    if (data.user && (given || family)) {
      await supabase.auth.updateUser({ data: { full_name: [given, family].filter(Boolean).join(' ') } });
    }
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // L'utilisateur a fermé la fenêtre Apple : pas une erreur à afficher.
    if (/cancel|1001/i.test(message)) return { error: null, cancelled: true };
    return { error: message || 'La connexion avec Apple a échoué.' };
  }
}
