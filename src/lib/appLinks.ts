import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const APP_SCHEME = 'queerservices';

/** Adresse publique du site : Stripe doit renvoyer vers une URL https, y compris depuis l'app. */
export const WEB_ORIGIN = 'https://www.queerservices.fr';

/** URL de retour après une page Stripe : retour direct sur le web, ou via /retour-app pour rouvrir l'app iOS. */
export function stripeReturnUrl(pathWithQuery: string): string {
  if (!Capacitor.isNativePlatform()) return `${window.location.origin}${pathWithQuery}`;
  return `${WEB_ORIGIN}/retour-app?to=${encodeURIComponent(pathWithQuery)}`;
}

/** Vrai quand le code tourne dans l'app iOS/Android (et non dans un navigateur). */
export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Écoute les liens `queerservices://chemin?x=y` (retour de Stripe, etc.) et
 * navigue vers le chemin correspondant dans l'app. Retourne la fonction de nettoyage.
 */
export function listenForAppLinks(navigate: (to: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = App.addListener('appUrlOpen', ({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== `${APP_SCHEME}:`) return;
      const path = `/${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}`;
      navigate(path);
    } catch {
      // lien illisible : on l'ignore
    }
  });
  return () => { handle.then((h) => h.remove()); };
}
