import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

let registeredFor: string | null = null;

/**
 * Registers the device for push notifications (iOS/Android app only) and
 * stores its token so the `send-push` edge function can reach the phone
 * even when it is locked or the app is closed.
 */
export async function registerPush(userId: string, onOpen: (url: string) => void): Promise<void> {
  if (!Capacitor.isNativePlatform() || registeredFor === userId) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener('registration', async (token) => {
      await supabase.from('device_tokens').upsert(
        {
          user_id: userId,
          token: token.value,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      );
    });
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error', err);
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.action_url;
      if (typeof url === 'string' && url.startsWith('/')) onOpen(url);
    });

    await PushNotifications.register();
    registeredFor = userId;
  } catch (e) {
    console.error('Push setup failed', e);
  }
}

export async function unregisterPush(): Promise<void> {
  registeredFor = null;
}
