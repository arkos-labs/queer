// Sends an iOS push notification (works with the phone locked / app closed)
// for every row inserted into public.notifications.
//
// Setup (Supabase dashboard):
//  1. Database → Webhooks → new webhook: table `notifications`, event INSERT,
//     type "Supabase Edge Functions" → function `send-push`.
//  2. Function secrets: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (content of
//     the .p8 file), APNS_BUNDLE_ID (com.queerservices.app) and
//     APNS_ENV = "production" (TestFlight / App Store) or "sandbox" (Xcode builds).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const b64url = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function apnsJwt(): Promise<string> {
  const keyId = Deno.env.get('APNS_KEY_ID')!;
  const teamId = Deno.env.get('APNS_TEAM_ID')!;
  const pem = Deno.env.get('APNS_PRIVATE_KEY')!.replace(/\\n/g, '\n');
  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const n = payload.record;
    if (!n?.user_id) return new Response('no record', { status: 200 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: tokens } = await supabase.from('device_tokens').select('token').eq('user_id', n.user_id);
    if (!tokens?.length) return new Response('no tokens', { status: 200 });

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', n.user_id)
      .is('read_at', null);

    // Les builds Xcode utilisent le serveur « sandbox », TestFlight / App Store le serveur
    // « production » : on essaie les deux (celui d'APNS_ENV en premier).
    const hosts = Deno.env.get('APNS_ENV') === 'sandbox'
      ? ['api.sandbox.push.apple.com', 'api.push.apple.com']
      : ['api.push.apple.com', 'api.sandbox.push.apple.com'];
    const jwt = await apnsJwt();
    const topic = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.queerservices.app';
    const body = JSON.stringify({
      aps: { alert: { title: n.title, body: n.body }, sound: 'default', badge: count ?? 1 },
      action_url: n.action_url,
    });

    await Promise.all(
      tokens.map(async ({ token }: { token: string }) => {
        let delivered = false;
        let onlyBadToken = true;
        for (const host of hosts) {
          const res = await fetch(`https://${host}/3/device/${token}`, {
            method: 'POST',
            headers: {
              authorization: `bearer ${jwt}`,
              'apns-topic': topic,
              'apns-push-type': 'alert',
              'apns-priority': '10',
            },
            body,
          });
          if (res.status === 200) { delivered = true; break; }
          const reason = await res.text();
          console.log(`APNs ${host} -> ${res.status} ${reason}`);
          if (!(res.status === 410 || res.status === 400)) onlyBadToken = false;
          // Mauvais serveur ou jeton invalide : on tente l'autre serveur.
        }
        if (!delivered && onlyBadToken) {
          // Refusé comme jeton invalide par les deux serveurs : il n'est plus valable.
          await supabase.from('device_tokens').delete().eq('token', token);
        }
      }),
    );
    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
