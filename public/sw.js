// Minimal service worker — exists purely to satisfy Chrome/Android's PWA
// installability criteria (manifest + a service worker with a fetch
// handler), so the native "Installer l'application" prompt (see
// InstallPWABanner.tsx) actually fires. Deliberately does NOT cache
// anything: this app is still being actively tested/iterated on, and a
// caching service worker would risk serving stale JS/CSS after a deploy.
// Every request is just passed straight through to the network.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
