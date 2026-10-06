// Fills events.photo_url from each event's website (og:image / twitter:image).
// Usage (run locally, never commit the key):
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/fetch-event-images.mjs
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const META = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
];

async function findImage(pageUrl) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QueerServicesBot/1.0)' },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  });
  if (!res.ok) return null;
  const html = (await res.text()).slice(0, 300000);
  for (const re of META) {
    const m = html.match(re);
    if (m) {
      try {
        return new URL(m[1].replace(/&amp;/g, '&'), res.url).toString();
      } catch {
        /* ignore malformed url */
      }
    }
  }
  return null;
}

const listRes = await fetch(
  `${url}/rest/v1/events?select=id,name,website_url&photo_url=is.null&website_url=not.is.null&limit=500`,
  { headers },
);
const events = await listRes.json();
console.log(`${events.length} événement(s) sans image.`);

for (const ev of events) {
  try {
    const img = await findImage(ev.website_url);
    if (!img) {
      console.log(`– ${ev.name}: pas d'image trouvée`);
      continue;
    }
    const up = await fetch(`${url}/rest/v1/events?id=eq.${ev.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ photo_url: img }),
    });
    console.log(`${up.ok ? '✓' : '✗'} ${ev.name}: ${img}`);
  } catch (e) {
    console.log(`✗ ${ev.name}: ${e.message}`);
  }
}
