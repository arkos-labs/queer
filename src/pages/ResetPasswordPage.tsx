import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import logoUrl from '@/assets/logo.png';

export function ResetPasswordPage() {
  const { updatePassword, signOut, finishPasswordRecovery } = useAuth();
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6 || password !== confirmation) return;
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  if (done) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#ede9fe] px-5 text-center">
        <div className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_20px_60px_-20px_rgba(91,33,182,0.28)]">
          <CheckCircle2 size={48} className="mx-auto text-violet-700" />
          <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">Mot de passe modifié</h1>
          <p className="mt-2 text-sm text-neutral-600">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <button onClick={async () => { await signOut(); finishPasswordRecovery(); navigate('/connexion'); }} className="mt-6 h-12 w-full rounded-2xl bg-violet-700 font-bold text-white">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center bg-[#ede9fe] px-5 py-6">
      <div className="relative mx-auto w-full max-w-sm">
        <button onClick={() => { finishPasswordRecovery(); navigate('/connexion'); }} className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm" aria-label="Retour à la connexion"><ArrowLeft size={21} /></button>
        <div className="mb-6 text-center">
          <img src={logoUrl} alt="Queer Services" className="mx-auto h-20 w-auto object-contain" />
          <h1 className="mt-3 font-display text-[28px] font-extrabold text-neutral-900">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-neutral-600">Choisissez un mot de passe d’au moins 6 caractères.</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-[28px] border border-violet-200/60 bg-white p-5 shadow-[0_18px_55px_-24px_rgba(91,33,182,0.35)]">
          <label className="mb-1.5 block text-xs font-bold text-neutral-700" htmlFor="new-password">Nouveau mot de passe</label>
          <div className="relative">
            <LockKeyhole size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input id="new-password" type={showPassword ? 'text' : 'password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-12 pr-12 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-neutral-500" aria-label="Afficher ou masquer le mot de passe">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
          </div>
          <label className="mb-1.5 mt-4 block text-xs font-bold text-neutral-700" htmlFor="confirm-password">Confirmer le mot de passe</label>
          <input id="confirm-password" type={showPassword ? 'text' : 'password'} minLength={6} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" autoComplete="new-password" />
          {confirmation && password !== confirmation && <p className="mt-2 text-xs text-red-700">Les mots de passe ne correspondent pas.</p>}
          {error && <div className="mt-4 flex gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
          <button type="submit" disabled={loading || password.length < 6 || password !== confirmation} className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 font-bold text-white disabled:opacity-45">{loading ? 'Modification…' : 'Enregistrer le mot de passe'}</button>
        </form>
      </div>
    </div>
  );
}
