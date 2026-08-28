import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: boolean }).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        setShow(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!hasDismissed) {
        setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96 animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900 px-5 py-4 text-white shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-inner">
            <Download size={22} className="text-white" />
          </div>
          <div className="pr-6">
            <h3 className="font-display font-semibold text-white">Installer l'application</h3>
            
            {isIOS ? (
              <div className="mt-1.5 text-xs text-neutral-400 space-y-1.5">
                <p>Pour une meilleure expérience, ajoutez Queer Service à votre écran d'accueil.</p>
                <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2">
                  <span className="flex items-center gap-1">1. Appuyez sur <Share size={14} className="mx-0.5" /></span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-2">
                  <span className="flex items-center gap-1">2. Choisissez <PlusSquare size={14} className="mx-0.5" /> <strong>Sur l'écran d'accueil</strong></span>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-neutral-400">
                  Installez Queer Service pour un accès rapide, hors-ligne, et des notifications instantanées.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  <Download size={16} /> Installer maintenant
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
