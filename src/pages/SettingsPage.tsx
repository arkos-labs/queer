import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Trash2, X, ShieldCheck, FileText, Scale, Cookie, ChevronRight, LifeBuoy, LogOut, MessageCircle } from 'lucide-react';

export function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [contactingSupport, setContactingSupport] = useState(false);
  const [showData, setShowData] = useState(false);

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



  const checkVerification = async () => {
    await supabase.rpc('refresh_my_verification');
    await refreshProfile();
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
      <div className="container-app max-w-xl pt-2">
        <h1 className="font-display text-3xl font-bold text-ink-base">Réglages</h1>

        {/* Compte */}
        <button
          onClick={() => navigate('/profil')}
          className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-white bg-white p-4 text-left shadow-soft active:scale-[0.99] transition-transform"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-lg font-bold text-primary-700">
            {profile?.photo_url ? <img src={profile.photo_url} alt="" className="h-full w-full object-cover" /> : (profile?.display_name?.slice(0, 1).toUpperCase() ?? 'Q')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-ink-base">{profile?.display_name ?? 'Mon compte'}</span>
            <span className="block truncate text-[13px] text-ink-muted">{user.email}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-neutral-300" />
        </button>
      </div>

      <div className="container-app max-w-xl space-y-6 py-5">
        <Group title="Aide & contact">
          <SettingsRow icon={<LifeBuoy size={18} />} iconClass="bg-secondary-50 text-secondary-600" label="Infos pratiques" description="Guides et numéros d’écoute" onClick={() => navigate('/ressources')} />
          <SettingsRow icon={<MessageCircle size={18} />} iconClass="bg-primary-50 text-primary-600" label="Contacter l’équipe" description={contactingSupport ? 'Ouverture de la messagerie…' : 'Nous répondons dès que possible'} onClick={contactSupport} disabled={contactingSupport} />
        </Group>

        <Group title="Confidentialité">
          <SettingsRow
            icon={<ShieldCheck size={18} />}
            iconClass="bg-primary-50 text-primary-600"
            label="Vos données en bref"
            description="Visibilité, données privées, vos droits"
            onClick={() => setShowData((v) => !v)}
            chevronOpen={showData}
          />
          {showData && (
            <div className="space-y-3 bg-paper-base/60 px-5 py-4 text-sm">
              {[
                ['Qui peut voir mon profil ?', 'Les membres connectés, pas les moteurs de recherche. Les visiteurs sans compte ne voient qu’un aperçu anonymisé.'],
                ['Quelles données restent privées ?', 'E-mail, téléphone et pièces d’identité ne sont jamais affichés publiquement.'],
                ['Comment demander mes données ?', 'Écrivez à l’équipe via la messagerie ; vous recevez un export sous 30 jours.'],
              ].map(([q, a]) => (
                <div key={q}>
                  <p className="font-semibold text-neutral-900">{q}</p>
                  <p className="text-neutral-500">{a}</p>
                </div>
              ))}
              <p className="text-xs text-neutral-400">Hébergement UE · Chiffrement AES-256</p>
            </div>
          )}
          <SettingsRow icon={<Scale size={18} />} iconClass="bg-neutral-100 text-neutral-500" label="Politique de confidentialité" onClick={() => navigate('/confidentialite')} />
        </Group>

        <Group title="Informations légales">
          <SettingsRow icon={<FileText size={18} />} iconClass="bg-neutral-100 text-neutral-500" label="Mentions légales" onClick={() => navigate('/mentions-legales')} />
          <SettingsRow icon={<Scale size={18} />} iconClass="bg-neutral-100 text-neutral-500" label="Conditions d’utilisation" onClick={() => navigate('/cgu')} />
          <SettingsRow icon={<Cookie size={18} />} iconClass="bg-neutral-100 text-neutral-500" label="Cookies" onClick={() => navigate('/cookies')} />
        </Group>

        <Group>
          <SettingsRow icon={<LogOut size={18} />} iconClass="bg-neutral-100 text-neutral-600" label={signingOut ? 'Déconnexion…' : 'Se déconnecter'} onClick={handleSignOut} disabled={signingOut} noChevron />
          <SettingsRow icon={<Trash2 size={18} />} iconClass="bg-error-50 text-error-600" label="Supprimer mon compte" description="Suppression définitive de vos données" onClick={() => setDeleteOpen(true)} danger noChevron />
        </Group>

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

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <p className="mb-2 px-3 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">{title}</p>}
      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-soft">{children}</div>
    </section>
  );
}

function SettingsRow({
  icon,
  iconClass,
  label,
  description,
  onClick,
  disabled = false,
  danger = false,
  noChevron = false,
  chevronOpen = false,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  noChevron?: boolean;
  chevronOpen?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3.5 text-left last:border-0 active:bg-neutral-50 disabled:opacity-60">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] font-semibold ${danger ? 'text-error-600' : 'text-neutral-900'}`}>{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-neutral-500">{description}</span>}
      </span>
      {!noChevron && <ChevronRight size={18} className={`shrink-0 text-neutral-300 transition-transform ${chevronOpen ? 'rotate-90' : ''}`} />}
    </button>
  );
}
