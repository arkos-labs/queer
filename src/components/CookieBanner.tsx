import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'qs_cookie_notice_ack_v1';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private mode etc.) — skip banner rather than crash
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Information sur les cookies"
      className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-2xl animate-slide-up p-3"
    >
      <div className="flex items-start gap-3 rounded-2xl bg-neutral-900 p-4 text-white shadow-2xl">
        <Cookie size={18} className="mt-0.5 shrink-0 text-primary-300" />
        <p className="flex-1 text-xs leading-relaxed text-neutral-200">
          Nous utilisons uniquement des cookies strictement nécessaires (connexion, préférences). Aucun traceur
          publicitaire.{' '}
          <a href="#/cookies" className="font-medium text-white underline underline-offset-2">
            En savoir plus
          </a>
        </p>
        <button
          onClick={dismiss}
          aria-label="Fermer ce message"
          className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
