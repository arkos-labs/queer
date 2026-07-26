import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Required for Chrome/Android to consider the app installable and fire
// beforeinstallprompt (see InstallPWABanner.tsx) — without an active
// service worker, the manifest.json alone isn't enough and the "Installer
// l'application" banner never appears on Android.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
