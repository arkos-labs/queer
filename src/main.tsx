import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Capacitor } from '@capacitor/core';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>
);

// Mise à jour automatique : quand le site est republié, un onglet ou une PWA restée ouverte
// recharge la nouvelle version au retour sur l'app (au plus une fois par minute).
if (!Capacitor.isNativePlatform()) {
  const scriptPattern = /\/assets\/index-[^/]+\.js$/;
  const loadedScript = Array.from(document.scripts).map((s) => s.src).find((src) => scriptPattern.test(src));
  const checkForUpdate = async () => {
    try {
      if (!loadedScript) return;
      const last = Number(sessionStorage.getItem('last-update-reload') ?? 0);
      if (Date.now() - last < 60_000) return;
      const html = await (await fetch('/?_=' + Date.now(), { cache: 'no-store' })).text();
      const latest = html.match(/\/assets\/index-[^"']+\.js/);
      if (latest && !loadedScript.endsWith(latest[0])) {
        sessionStorage.setItem('last-update-reload', String(Date.now()));
        window.location.reload();
      }
    } catch {
      // hors ligne ou stockage indisponible : on réessaiera plus tard
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
  window.setInterval(checkForUpdate, 5 * 60 * 1000);
}

// Required for Chrome/Android to consider the app installable and fire
// beforeinstallprompt (see InstallPWABanner.tsx) — without an active
// service worker, the manifest.json alone isn't enough and the "Installer
// l'application" banner never appears on Android.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
