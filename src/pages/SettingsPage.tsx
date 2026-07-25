import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Download, Trash2, AlertTriangle, X, ShieldCheck, FileText, Scale, Cookie, ChevronRight } from 'lucide-react';

export function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    navigate('/connexion');
    return null;
  }

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
          <h1 className="font-display text-3xl font-semibold text-neutral-900">Paramètres & confidentialité</h1>
          <p className="mt-2 text-neutral-600">Gérez vos données et votre compte, conformément au RGPD.</p>
        </div>
      </div>

      <div className="container-app max-w-3xl py-8 space-y-6">
        {/* Privacy */}
        <div className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900">Confidentialité</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Votre profil est visible par les autres membres de la communauté. Votre email et téléphone ne sont
                affichés que sur la fiche détaillée, aux membres connectés.
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Vos données sont hébergées en Union Européenne, chiffrées au repos et en transit.
              </p>
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
              <p className="mt-1 text-sm text-neutral-600">
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

        {/* Delete */}
        <div className="card border-error-200 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error-50 text-error-600">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Droit à l'effacement</h2>
              <p className="mt-1 text-sm text-neutral-600">
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900">Informations légales</h2>
              <p className="mt-1 text-sm text-neutral-600">Mentions légales, conditions d'utilisation et politiques de la plateforme.</p>
            </div>
          </div>
          <nav className="border-t border-neutral-100">
            {([
              { to: '/mentions-legales', label: 'Mentions légales', icon: FileText },
              { to: '/cgu', label: "Conditions Générales d'Utilisation", icon: Scale },
              { to: '/confidentialite', label: 'Politique de confidentialité', icon: ShieldCheck },
              { to: '/cookies', label: 'Politique de cookies', icon: Cookie },
            ] as const).map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className="flex w-full items-center gap-3 border-b border-neutral-100 px-6 py-3.5 text-left text-sm text-neutral-700 last:border-0 hover:bg-neutral-50 md:px-8"
              >
                <l.icon size={16} className="shrink-0 text-neutral-400" />
                <span className="flex-1">{l.label}</span>
                <ChevronRight size={16} className="shrink-0 text-neutral-300" />
              </button>
            ))}
          </nav>
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
            <p className="mt-4 text-sm text-neutral-600">
              Cette action supprimera définitivement votre compte et toutes les données associées. Vous ne pourrez pas
              annuler cette opération.
            </p>
            <p className="mt-3 text-sm font-medium text-neutral-800">Tapez « supprimer » pour confirmer.</p>
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
