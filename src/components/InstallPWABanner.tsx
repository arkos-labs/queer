import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/fr/app/queer-services/id6817094310';

// Small pause so the page is visible before the popup covers it.
const SHOW_DELAY_MS = 4_000;

const DISMISS_KEY = 'pwa_prompt_dismissed';

// Stored in localStorage AND a 1-year cookie: Safari wipes localStorage after
// 7 days without a visit, which would bring the popup back.
function isDismissed(): boolean {
  try {
    if (localStorage.getItem(DISMISS_KEY)) return true;
  } catch {
    // localStorage unavailable
  }
  return document.cookie.split('; ').some((c) => c.startsWith(`${DISMISS_KEY}=`));
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, 'true');
  } catch {
    // ignore
  }
  document.cookie = `${DISMISS_KEY}=1; max-age=31536000; path=/; SameSite=Lax`;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already installed as a PWA, or dismissed for good: never show.
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone) {
      setIsStandalone(true);
      return;
    }
    if (isDismissed()) return;

    // Shown on every screen (phone, tablet, desktop).
    const timer = window.setTimeout(() => setShow(true), SHOW_DELAY_MS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') handleDismiss();
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    rememberDismissal();
  };

  if (isStandalone || !show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Installer l'application"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm animate-slide-up rounded-3xl bg-white px-6 pb-5 pt-8 text-center shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <img src="/icons/app-icon.png" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg" />
        <h3 className="font-display text-xl font-bold text-neutral-900">Téléchargez l'application</h3>

        <p className="mt-2 text-sm text-neutral-600">
          Queer Services est disponible sur l'App Store : notifications, accès rapide et meilleure expérience.
        </p>
        <a
          href={APP_STORE_URL}
          // Same tab and no immediate unmount: Safari hands apps.apple.com over
          // to the App Store app, and a new blank tab or a removed link breaks that.
          onClick={() => {
            rememberDismissal();
            window.setTimeout(() => setShow(false), 1500);
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-500"
        >
          <Download size={18} /> Télécharger sur l'App Store
        </a>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Ou installer la version web
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="mt-3 w-full py-1 text-center text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
        >
          Ne plus me demander
        </button>
      </div>
    </div>
  );
}
