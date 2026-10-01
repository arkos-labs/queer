import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Trash2, AlertTriangle, X, ShieldCheck, FileText, Scale, Cookie, ChevronRight, LifeBuoy, CheckCircle2, Clock, LogOut, UserCheck, MessageCircle } from 'lucide-react';

export function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [checkingVerif, setCheckingVerif] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeOk, setCodeOk] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [contactingSupport, setContactingSupport] = useState(false);

  const contactSupport = async () => {
    if (!user) return;
    setContactingSupport(true);
    setError(null);
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .maybeSingle();

      if (adminErr || !adminData) {
        throw new Error('Impossible de trouver un administrateur à contacter.');
      }
      
      const adminId = adminData.id;
      if (adminId === user.id) {
        throw new Error('Vous êtes déjà administrateur.');
      }

      const { data: existing, error: findErr } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user_a.eq.${user.id},user_b.eq.${adminId}),and(user_a.eq.${adminId},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) throw findErr;

      let connId = existing?.id;
      if (!connId) {
        const { data: created, error: createErr } = await supabase
          .from('connections')
          .insert({
            user_a: user.id,
            user_b: adminId,
            service_label: 'Support Queer Service',
            status: 'accepted',
          })
          .select('id')
          .single();
        if (createErr) throw createErr;
        connId = created.id;
      }
      
      navigate(`/messages/${connId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de contacter le support.');
    } finally {
      setContactingSupport(false);
    }
  };

  if (!user) {
    navigate('/connexion');
    return null;
  }



  const emailDone = codeOk || profile?.verification_status === 'verified';

  const checkVerification = async () => {
    setCheckingVerif(true);
    await supabase.rpc('refresh_my_verification');
    await refreshProfile();
    setCheckingVerif(false);
  };

  // Sends a one-time code by e-mail (free, no SMS).
  const sendCode = async () => {
    if (!user?.email) return;
    setCodeBusy(true);
    setCodeError(null);
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    setCodeBusy(false);
    if (otpErr) {
      setCodeError(otpErr.message.toLowerCase().includes('rate') ? 'Trop de demandes. Réessayez dans quelques minutes.' : otpErr.message);
      return;
    }
    setCodeSent(true);
  };

  const confirmCode = async () => {
    if (!user?.email || code.trim().length < 6) return;
    setCodeBusy(true);
    setCodeError(null);
    const { error: verifyErr } = await supabase.auth.verifyOtp({ email: user.email, token: code.trim(), type: 'email' });
    if (verifyErr) {
      setCodeBusy(false);
      setCodeError('Code incorrect ou expiré.');
      return;
    }
    setCodeOk(true);
    setCode('');
    await supabase.rpc('mark_email_code_verified');
    await checkVerification();
    setCodeBusy(false);
  };

  useEffect(() => {
    if (user) void checkVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/');
  };

  const deleteAccount = async () => {
    setDeleteLoading(true);
    setError(null);
    // Delete profile row (cascades child rows), then sign out.
    const { error: delErr } = await supabase.from('profiles').delete().eq('id', user.id);
    if (delErr) {
      setError(delErr.message);
      setDeleteLoading(false);
      return;
    }
    await signOut();
    setDeleteLoading(false);
    setDeleteOpen(false);
    navigate('/');
  };

  return (
    <div className="animate-fade-in bg-paper-base pb-28">
      <div className="container-app pt-4">
        <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#5221b8_0%,#7c3aed_52%,#d946a6_100%)] px-5 py-5 text-white shadow-lift">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/35 bg-white/20 text-lg font-bold">
              {profile?.photo_url ? <img src={profile.photo_url} alt="" className="h-full w-full object-cover" /> : (profile?.display_name?.slice(0, 1).toUpperCase() ?? 'Q')}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Mon espace</p>
              <h1 className="font-display text-2xl font-semibold">Réglages</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/85">Gérez votre compte et gardez le contrôle sur vos données.</p>
        </div>
      </div>

      <div className="container-app max-w-xl space-y-5 py-5">
        <section>
          <p className="mb-2 px-2 text-[11px] font-bold tracking-[0.12em] text-ink-muted">AIDE &amp; CONTACT</p>
          <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-soft">
            <SettingsRow icon={<LifeBuoy size={20} />} iconClass="bg-secondary-50 text-secondary-600" label="Besoin d’aide ?" description="Guides et numéros d’écoute" onClick={() => navigate('/ressources')} />
            <SettingsRow icon={<MessageCircle size={20} />} iconClass="bg-primary-50 text-primary-600" label="Contacter l’équipe" description={contactingSupport ? 'Ouverture de la messagerie…' : 'Assistance directe dans l’application'} onClick={contactSupport} disabled={contactingSupport} />
          </div>
        </section>

        {/* Privacy */}
        <section>
          <p className="mb-2 px-2 text-[11px] font-bold tracking-[0.12em] text-ink-muted">CONFIDENTIALITÉ &amp; RGPD</p>
        <div className="rounded-3xl border border-white bg-white p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900">Données &amp; visibilité</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Votre profil est visible par les membres. Vos coordonnées privées restent confidentielles.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                <span className="rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-700">● Hébergement UE · Chiffrement AES-256</span>
              </p>

              <div className="mt-4 rounded-2xl bg-paper-base/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Vos données en bref</p>
                <dl className="mt-2 space-y-2 text-sm text-neutral-700">
                  <div>
                    <dt className="font-semibold text-neutral-900">Qui peut voir mon profil ?</dt>
                    <dd className="text-neutral-500">Les membres connectés de la communauté, pas les visiteurs anonymes ni les moteurs de recherche.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900">Quelles données sont publiques ?</dt>
                    <dd className="text-neutral-500">Votre nom affiché, bio, ville, services proposés et avis reçus.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900">Quelles données restent privées ?</dt>
                    <dd className="text-neutral-500">E-mail, téléphone et pièces d'identité ne sont jamais affichés publiquement.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900">Comment supprimer mon compte ?</dt>
                    <dd className="text-neutral-500">Depuis cette page, à tout moment — suppression immédiate et définitive.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-neutral-900">Comment demander mes données ?</dt>
                    <dd className="text-neutral-500">Écrivez à l'équipe Queer Services via la messagerie ; vous recevez un export sous 30 jours.</dd>
                  </div>
                </dl>
                <button
                  onClick={() => navigate('/confidentialite')}
                  className="mt-3 text-sm font-bold text-primary-700"
                >
                  Lire la politique complète →
                </button>
              </div>
            </div>
          </div>
        </div>
        </section>

        {/* Account verification: e-mail code */}
        <div className="rounded-3xl border border-white bg-white p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <UserCheck size={20} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-neutral-900">Compte vérifié</h2>
                {profile?.verification_status === 'verified' && (
                  <span className="badge-chip bg-success-100 text-success-700">
                    <CheckCircle2 size={12} /> Vérifié·e
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Aucune pièce d'identité demandée : un code reçu par e-mail suffit.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  {emailDone ? <CheckCircle2 size={16} className="text-success-600" /> : <Clock size={16} className="text-warning-600" />}
                  <span className="text-neutral-800">{emailDone ? 'E-mail confirmé par code' : 'E-mail à confirmer avec un code'}</span>
                </li>
              </ul>
              {profile?.verification_status !== 'verified' && !emailDone && (
                <div className="mt-4 space-y-2">
                  {!codeSent ? (
                    <button onClick={sendCode} disabled={codeBusy} className="btn-primary w-full justify-center">
                      {codeBusy ? 'Envoi…' : 'Recevoir mon code par e-mail'}
                    </button>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-500">Code envoyé à {user.email}. Pensez à regarder les indésirables.</p>
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Code à 6 chiffres"
                        className="input text-center tracking-[0.3em]"
                      />
                      <button onClick={confirmCode} disabled={codeBusy || code.length < 6} className="btn-primary w-full justify-center">
                        {codeBusy ? 'Vérification…' : 'Valider le code'}
                      </button>
                      <button onClick={sendCode} disabled={codeBusy} className="btn-ghost w-full justify-center text-xs">Renvoyer un code</button>
                    </>
                  )}
                  {codeError && <p className="text-sm text-error-600">{codeError}</p>}
                </div>
              )}
              {profile?.verification_status !== 'verified' && (
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={checkVerification} disabled={checkingVerif} className="btn-outline w-full justify-center">
                    {checkingVerif ? 'Vérification…' : 'Actualiser ma vérification'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete */}
        <div className="rounded-3xl border border-error-100 bg-white p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error-50 text-error-600">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Droit à l'effacement</h2>
              <p className="mt-1 text-sm text-neutral-500">
                La suppression de votre compte est définitive. Toutes vos données (profil, avis, mises en relation,
                badges) seront effacées. Cette action est irréversible.
              </p>
              <button onClick={() => setDeleteOpen(true)} className="btn mt-4 w-full justify-center border border-error-300 bg-white text-error-600 hover:bg-error-50">
                <Trash2 size={16} /> Supprimer mon compte
              </button>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="overflow-hidden rounded-3xl border border-white bg-white p-0 shadow-soft">
          <div className="flex items-start gap-4 p-6 md:p-8 md:pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900">Informations légales</h2>
              <p className="mt-1 text-sm text-neutral-500">Mentions légales, conditions d'utilisation et politiques de la plateforme.</p>
            </div>
          </div>
          <nav className="border-t border-neutral-200">
            {([
              { to: '/mentions-legales', label: 'Mentions légales', icon: FileText },
              { to: '/cgu', label: "Conditions Générales d'Utilisation", icon: Scale },
              { to: '/confidentialite', label: 'Politique de confidentialité', icon: ShieldCheck },
              { to: '/cookies', label: 'Politique de cookies', icon: Cookie },
            ] as const).map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className="flex w-full items-center gap-3 border-b border-neutral-200 px-6 py-3.5 text-left text-sm text-neutral-900 last:border-0 hover:bg-neutral-100 md:px-8"
              >
                <l.icon size={16} className="shrink-0 text-neutral-400" />
                <span className="flex-1">{l.label}</span>
                <ChevronRight size={16} className="shrink-0 text-neutral-400" />
              </button>
            ))}
          </nav>
        </div>

        {/* Sign out */}
        <div className="rounded-3xl border border-white bg-white p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              <LogOut size={20} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Se déconnecter</h2>
              <p className="mt-1 text-sm text-neutral-500">Terminez votre session sur cet appareil.</p>
              <button onClick={handleSignOut} disabled={signingOut} className="btn-outline mt-4 w-full justify-center text-error-600 hover:text-error-700 hover:bg-error-50 border-error-200">
                <LogOut size={16} /> {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>}
      </div>

      {/* Delete confirm modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteOpen(false)} />
          <div className="card relative z-10 w-full max-w-md animate-scale-in p-6">
            <div className="flex items-center justify-between">
              <h3 id="delete-modal-title" className="font-display text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
              <button onClick={() => setDeleteOpen(false)} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm text-neutral-500">
              Cette action supprimera définitivement votre compte et toutes les données associées. Vous ne pourrez pas
              annuler cette opération.
            </p>
            <p className="mt-3 text-sm font-medium text-neutral-900">Tapez « supprimer » pour confirmer.</p>
            <ConfirmInput onConfirm={deleteAccount} loading={deleteLoading} />
            {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmInput({ onConfirm, loading }: { onConfirm: () => void; loading: boolean }) {
  const [val, setVal] = useState('');
  return (
    <div className="mt-3">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="input"
        placeholder="supprimer"
        aria-label="Tapez supprimer pour confirmer la suppression du compte"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onConfirm} disabled={val !== 'supprimer' || loading} className="btn bg-error-600 text-white hover:bg-error-700 disabled:opacity-50">
          {loading ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  iconClass,
  label,
  description,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 border-b border-neutral-100 px-5 py-4 text-left last:border-0 disabled:opacity-60">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-neutral-900">{label}</span>
        <span className="mt-0.5 block truncate text-[13px] text-neutral-500">{description}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-neutral-300" />
    </button>
  );
}
