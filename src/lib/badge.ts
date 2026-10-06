import { Capacitor } from '@capacitor/core';

// Pastille rouge sur l'icône de l'app (iPhone) = nombre de notifications non lues.
export async function setAppBadge(count: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Badge } = await import('@capawesome/capacitor-badge');
    const perm = await Badge.checkPermissions();
    if (perm.display !== 'granted') return;
    if (count > 0) await Badge.set({ count });
    else await Badge.clear();
  } catch {
    // le badge est un confort : ne jamais bloquer l'app
  }
}
