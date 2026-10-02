import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { BrandHeader } from '@/components/BrandHeader';

// Lien expiré / déjà utilisé : Supabase renvoie #error=…&error_code=otp_expired
function linkErrorFromUrl(): string | null {
  const raw = window.location.hash.replace(/^#/, '') || window.location.search.replace(/^\?/, '');
  const params = new URLSearchParams(raw);
  if (!params.get('error') && !params.get('error_code')) return null;
  return 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien de réinitialisation.';
}

export function ResetPasswordPage() {
  const { navigate } = useRouter();
  const { session, profile, updatePassword, finishPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkError] = useState(linkErrorFromUrl);

  const noSession = !session && !success;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');

    setLoading(true);
    const { error: err } = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(/different from the old/i.test(err)
        ? 'Le nouveau mot de passe doit être différent de l’ancien.'
        : /session/i.test(err)
          ? 'Votre lien a expiré. Demandez un nouveau lien de réinitialisation.'
          : err);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      finishPasswordRecovery();
      navigate(profile?.display_name ? '/annuaire' : '/onboarding', { replace: true });
    }, 1800);
  };

  const goForgot = () => {
    finishPasswordRecovery();
    navigate('/mot-de-passe-oublie', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#ede9fe] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-sm flex-col">
        <div className="mb-5 text-center">
          <BrandHeader safeArea={false} />
          <h1 className="font-display text-[28px] font-extrabold text-neutral-900">Nouveau mot de passe</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-600">Choisissez un mot de passe d’au moins 8 caractères.</p>
        </div>

        <div className="rounded-[28px] border border-violet-200/60 bg-white p-5 shadow-[0_18px_55px_-24px_rgba(91,33,182,0.35)]">
          {success ? (
            <div className="flex gap-2 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              Mot de passe modifié ! Redirection…
            </div>
          ) : linkError || noSession ? (
            <>
              <div className="flex gap-2 rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                {linkError ?? 'Ce lien n’est plus valide. Ouvrez le lien le plus récent reçu par e-mail, ou demandez-en un nouveau.'}
              </div>
              <button onClick={goForgot} className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 font-bold text-white">
                Recevoir un nouveau lien
              </button>
            </>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-xs font-bold text-neutral-700">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="Au moins 8 caractères"
                    className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-12 pr-12 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-neutral-500" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {show ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-bold text-neutral-700">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="confirm-password"
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="Retapez le mot de passe"
                    className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-12 pr-4 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </div>
              {error && (
                <div className="flex gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
                </div>
              )}
              <button type="submit" disabled={loading} className="h-14 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 font-bold text-white shadow-[0_10px_26px_-8px_rgba(109,40,217,0.65)] disabled:opacity-45">
                {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
