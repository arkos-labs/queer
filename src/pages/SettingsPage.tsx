import { useEffect, useState } from 'react';
import { supabase, edgeFunctionErrorMessage } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Download, Trash2, AlertTriangle, X, ShieldCheck, FileText, Scale, Cookie, ChevronRight, LifeBuoy, CreditCard, CheckCircle2, Clock, LogOut, UserCheck, Upload, XCircle, MessageCircle } from 'lucide-react';

export function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
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

  useEffect(() => {
    // Coming back from the Stripe onboarding flow — pull the account's
    // current charges_enabled/payouts_enabled directly from Stripe (more
    // reliable than waiting on a webhook) then refresh the local profile.
    if (window.location.hash.includes('stripe=return')) {
      supabase.functions.invoke('stripe-sync-account').finally(() => refreshProfile());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    navigate('/connexion');
    return null;
  }

  const startStripeOnboarding = async () => {
    setStripeLoading(true);
    setStripeError(null);
    const base = window.location.origin + window.location.pathname;
    const { data, error: fnErr } = await supabase.functions.invoke('stripe-connect-onboarding', {
      body: {
        return_url: `${base}#/parametres?stripe=return`,
        refresh_url: `${base}#/parametres?stripe=refresh`,
      },
    });
    setStripeLoading(false);
    if (fnErr) {
      setStripeError(await edgeFunctionErrorMessage(fnErr, "Impossible de démarrer la configuration des paiements. Réessayez plus tard."));
      return;
    }
    if (!data?.url) {
      setStripeError("Impossible de démarrer la configuration des paiements. Réessayez plus tard.");
      return;
    }
    window.location.href = data.url;
  };

  const syncStripeStatus = async () => {
    setSyncingStripe(true);
    await supabase.functions.invoke('stripe-sync-account');
    await refreshProfile();
    setSyncingStripe(false);
  };

  const uploadIdentityDocument = async (file: File) => {
    if (!user) return;
    const okType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!okType) {
      setIdError('Le fichier doit être une image (JPG, PNG, WebP) ou un PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setIdError('Fichier trop lourd (10 Mo maximum).');
      return;
    }
    setUploadingId(true);
    setIdError(null);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('identity-documents').upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingId(false);
      setIdError(upErr.message);
      return;
    }
    const { error: patchErr } = await supabase
      .from('profiles')
      .update({ identity_document_path: path, verification_status: 'pending' })
      .eq('id', user.id);
    setUploadingId(false);
    if (patchErr) {
      setIdError(patchErr.message);
      return;
    }
    await refreshProfile();
  };

  const exportMyData = async () => {
    setExporting(true);
    setError(null);
    const [profRes, pbRes, revRes, connRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('profile_badges').select('badge:badges(*)').eq('profile_id', user.id),
      supabase.from('reviews').select('*').eq('author_id', user.id),
      supabase.from('connections').select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    ]);
    setExporting(false);
    if (profRes.error) {
      setError(profRes.error.message);
      return;
    }
    const dump = {
      exported_at: new Date().toISOString(),
      profile: profRes.data,
      badges: pbRes.data,
      reviews_authored: revRes.data,
      connections: connRes.data,
    };
    const json = JSON.stringify(dump, null, 2);
    setExportData(json);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `queer-service-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <h1 className="font-display text-3xl font-semibold text-neutral-900">Paramètres & <span className="gradient-text">confidentialité</span></h1>
          <p className="mt-2 text-neutral-500">Gérez vos données et votre compte, conformément au RGPD.</p>
        </div>
      </div>

      <div className="container-app max-w-3xl py-8 space-y-6">
        {/* Help */}
        <button
          onClick={() => navigate('/ressources')}
          className="card flex w-full items-center gap-4 p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift md:p-8"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
            <LifeBuoy size={20} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Besoin d'aide ?</h2>
            <p className="mt-1 text-sm text-neutral-500">Numéros d'écoute et guides pratiques, gratuits et confidentiels.</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-neutral-400" />
        </button>

        {/* Contact Support */}
        <button
          onClick={contactSupport}
          disabled={contactingSupport}
          className="card flex w-full items-center gap-4 p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift md:p-8"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <MessageCircle size={20} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Contacter l'équipe</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {contactingSupport ? 'Ouverture de la messagerie...' : 'Un problème, une question ? Écrivez-nous directement dans l\'application.'}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-neutral-400" />
        </button>

        {/* Privacy */}
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900">Confidentialité</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Votre profil est visible par les autres membres de la communauté. Votre email et téléphone ne sont
                affichés que sur la fiche détaillée, aux membres connectés.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Vos données sont hébergées en Union Européenne, chiffrées au repos et en transit.
              </p>
            </div>
          </div>
        </div>

        {/* Identity verification */}
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <UserCheck size={20} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-neutral-900">Vérification d'identité</h2>
                {profile?.verification_status === 'verified' && (
                  <span className="badge-chip bg-success-100 text-success-700">
                    <CheckCircle2 size={12} /> Vérifié·e
                  </span>
                )}
                {profile?.verification_status === 'pending' && (
                  <span className="badge-chip bg-warning-100 text-warning-700">
                    <Clock size={12} /> En cours de vérification
                  </span>
                )}
                {profile?.verification_status === 'rejected' && (
                  <span className="badge-chip bg-error-100 text-error-700">
                    <XCircle size={12} /> Document refusé
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Envoyez une photo de votre pièce d'identité (carte d'identité, passeport ou titre de séjour) pour
                obtenir le badge « vérifié·e ». Un membre de l'équipe la vérifie manuellement ; elle n'est jamais
                rendue publique et reste accessible uniquement à vous et à l'équipe de modération.
              </p>
              {profile?.verification_status !== 'verified' && (
                <div className="mt-4">
                  <label className="btn-outline cursor-pointer">
                    <Upload size={16} />
                    {uploadingId ? 'Envoi…' : profile?.identity_document_path ? 'Envoyer un nouveau document' : 'Envoyer ma pièce d\'identité'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploadingId}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadIdentityDocument(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}
              {idError && <p className="mt-3 text-sm text-error-600">{idError}</p>}
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <CreditCard size={20} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-neutral-900">Recevoir des paiements</h2>
                {profile?.stripe_charges_enabled ? (
                  <span className="badge-chip bg-success-100 text-success-700">
                    <CheckCircle2 size={12} /> Activé
                  </span>
                ) : profile?.stripe_account_id ? (
                  <span className="badge-chip bg-warning-100 text-warning-700">
                    <Clock size={12} /> Configuration en cours
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Activez les paiements pour pouvoir être payé·e directement dans l'app quand un membre vous demande un
                service payant (ex. montage de meuble). Vos coordonnées bancaires et votre pièce d'identité sont
                gérées par notre prestataire de paiement sécurisé et ne transitent jamais par Queer Service.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={startStripeOnboarding} disabled={stripeLoading} className="btn-outline">
                  <CreditCard size={16} />
                  {stripeLoading
                    ? 'Redirection…'
                    : profile?.stripe_charges_enabled
                      ? 'Gérer mon compte de paiement'
                      : profile?.stripe_account_id
                        ? 'Continuer la configuration'
                        : 'Activer les paiements'}
                </button>
                {profile?.stripe_account_id && !profile?.stripe_charges_enabled && (
                  <button onClick={syncStripeStatus} disabled={syncingStripe} className="btn-ghost text-sm">
                    {syncingStripe ? 'Vérification…' : 'Rafraîchir le statut'}
                  </button>
                )}
              </div>
              {stripeError && <p className="mt-3 text-sm text-error-600">{stripeError}</p>}
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
              <FileText size={20} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Droit à la portabilité</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Téléchargez toutes les données associées à votre compte (profil, badges, avis, mises en relation) au
                format JSON.
              </p>
              <button onClick={exportMyData} disabled={exporting} className="btn-outline mt-4">
                <Download size={16} /> {exporting ? 'Exportation…' : 'Exporter mes données'}
              </button>
              {exportData && (
                <p className="mt-3 text-xs text-success-600">Export généré et téléchargé.</p>
              )}
            </div>
          </div>
        </div>

        {/* Install App */}
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Download size={20} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Installer l'application</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Installez Queer Service sur votre écran d'accueil pour y accéder plus rapidement.
              </p>
              <button onClick={() => navigate('/installer')} className="btn-outline mt-4">
                <Download size={16} /> Voir les instructions
              </button>
            </div>
          </div>
        </div>



        {/* Delete */}
        <div className="card border-error-200 p-6 md:p-8">
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
              <button onClick={() => setDeleteOpen(true)} className="btn mt-4 border border-error-300 bg-white text-error-600 hover:bg-error-50">
                <Trash2 size={16} /> Supprimer mon compte
              </button>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="card overflow-hidden p-0">
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
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              <LogOut size={20} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Se déconnecter</h2>
              <p className="mt-1 text-sm text-neutral-500">Terminez votre session sur cet appareil.</p>
              <button onClick={handleSignOut} disabled={signingOut} className="btn-outline mt-4 text-error-600 hover:text-error-700 hover:bg-error-50 border-error-200">
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
