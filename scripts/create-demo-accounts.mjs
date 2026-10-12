// Crée (ou met à jour) les deux comptes de démonstration fournis à Apple App Review.
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   DEMO_PASSWORD='MotDePasseDeDemo!2026' \
//   node scripts/create-demo-accounts.mjs
//
// La clé service_role ne doit jamais être commitée ni mise dans l'app.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DEMO_PASSWORD sont requis.');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const accounts = [
  {
    email: 'review.particulier@queerservices.fr',
    profile: {
      display_name: 'Démo Particulier',
      civilite: 'Iel',
      city: 'Paris',
      account_type: 'particulier',
      skills: ['Montage & bricolage'],
      needs: ['Jardinage'],
      bio: 'Compte de démonstration pour la validation App Store.',
    },
  },
  {
    email: 'review.pro@queerservices.fr',
    profile: {
      display_name: 'Démo Professionnel',
      civilite: 'Iel',
      city: 'Lyon',
      account_type: 'pro',
      skills: ['Informatique'],
      needs: [],
      bio: 'Compte de démonstration professionnel pour la validation App Store.',
    },
  },
];

for (const { email, profile } of accounts) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list?.users.find((u) => u.email === email);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const now = new Date().toISOString();
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    email,
    ...profile,
    is_community_member: true,
    charte_accepted: true,
    charte_accepted_at: now,
    profile_status: 'active',
    email_code_verified_at: now,
  });
  if (error) throw error;
  console.log(`OK  ${email} (${profile.account_type})`);
}

// Des triggers (guard_verification_*) remettent le statut « vérifié » à zéro pour
// tout appel hors fonction SQL de vérification : à finir dans le SQL Editor.
console.log(`
Dernière étape — colle ceci dans Supabase > SQL Editor :

begin;
select set_config('app.verify', '1', true);
update public.profiles
  set verification_status = 'verified', verified_at = now(), email_code_verified_at = now()
  where email in (${accounts.map((a) => `'${a.email}'`).join(', ')});
commit;
`);
