import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { BrandHeader } from '@/components/BrandHeader';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSent(false);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        requestPasswordReset(email.trim()),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('timeout')), 15000);
        }),
      ]);
      if (result.error) {
        setError(/sending.*(?:recovery|email)/i.test(result.error)
          ? 'Le service d’envoi est indisponible. Veuillez réessayer plus tard.'
          : result.error);
      } else {
        setSent(true);
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'timeout'
        ? 'L’envoi prend trop de temps. Vérifiez votre boîte mail avant de réessayer dans une minute.'
        : 'Impossible de confirmer l’envoi. Vérifiez votre connexion et réessayez.');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-hidden bg-[#ede9fe] px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
      <div className="relative mx-auto flex h-full w-full max-w-sm flex-col">
        <button onClick={() => navigate('/connexion')} className="absolute left-0 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm" aria-label="Retour à la connexion"><ArrowLeft size={21} /></button>
        <div className="mb-5 text-center">
          <BrandHeader safeArea={false} />
          <h1 className="font-display text-[28px] font-extrabold text-neutral-900">Mot de passe oublié ?</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-600">Indiquez votre adresse e-mail pour recevoir un lien de réinitialisation.</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-[28px] border border-violet-200/60 bg-white p-5 shadow-[0_18px_55px_-24px_rgba(91,33,182,0.35)]">
          <label className="mb-1.5 block text-xs font-bold text-neutral-700" htmlFor="reset-email">Adresse e-mail</label>
          <div className="relative">
            <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-12 pr-4 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="vous@exemple.fr" autoComplete="email" inputMode="email" />
          </div>
          {error && <div className="mt-4 flex gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
          {sent && !error && <div className="mt-4 flex gap-2 rounded-2xl bg-violet-50 p-3 text-sm leading-relaxed text-violet-900"><MailCheck size={18} className="mt-0.5 shrink-0" />Si cette adresse correspond à un compte, le lien vient d’être envoyé. Vérifiez aussi vos spams.</div>}
          <button type="submit" disabled={loading} className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 font-bold text-white shadow-[0_10px_26px_-8px_rgba(109,40,217,0.65)] disabled:opacity-45">{loading ? 'Envoi…' : 'Recevoir le lien'}</button>
          <div className="mt-5 border-t border-violet-100 pt-5">
            <p className="text-center text-xs font-bold uppercase tracking-[0.12em] text-violet-700">Comment ça marche ?</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-neutral-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">1</span>Recevez le lien dans votre boîte mail</div>
              <div className="flex items-center gap-3 text-sm text-neutral-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">2</span>Choisissez votre nouveau mot de passe</div>
              <div className="flex items-center gap-3 text-sm text-neutral-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">3</span>Reconnectez-vous à votre espace</div>
            </div>
            <p className="mt-5 text-center text-[11px] leading-relaxed text-neutral-500">Pensez à vérifier vos spams si le message n’apparaît pas.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
