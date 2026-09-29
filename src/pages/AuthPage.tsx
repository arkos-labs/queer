import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import { BrandHeader } from '@/components/BrandHeader';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptSensitiveData, setAcceptSensitiveData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Set when signup succeeded but Supabase requires the person to confirm
  // their email address before a session exists — shown instead of
  // silently bouncing them to /onboarding (where they'd have no active
  // session and get redirected straight back to the login page).
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isSignup = mode === 'signup';
  const canSubmit = !isSignup || (acceptTerms && acceptSensitiveData);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    if (isSignup) {
      const { error, needsConfirmation } = await signUp(email, password);
      setLoading(false);
      if (error) {
        setError(error);
        return;
      }
      if (needsConfirmation) {
        setConfirmationSent(true);
        return;
      }
      navigate('/onboarding');
    } else {
      const res = await signIn(email, password);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        if (!res.profile || !res.profile.display_name) {
          navigate('/onboarding');
        } else {
          navigate('/annuaire');
        }
      }
    }
  };

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ede9fe] px-5 py-12">
        <div className="w-full max-w-sm rounded-[28px] bg-white p-7 text-center shadow-[0_20px_60px_-20px_rgba(91,33,182,0.28)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
              <MailCheck size={30} className="text-violet-700" />
            </div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">Vérifiez votre boîte mail</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Cliquez dessus pour activer votre
              compte, vous pourrez ensuite compléter votre profil.
            </p>
            <p className="mt-5 text-xs text-neutral-500">
              Rien reçu ? Vérifiez vos spams, ou{' '}
              <button onClick={() => setConfirmationSent(false)} className="font-bold text-violet-700">
                réessayez
              </button>
              .
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className={isSignup
      ? 'min-h-[100dvh] bg-[#ede9fe] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2'
      : 'h-full overflow-hidden bg-[#ede9fe] px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2'
    }>
      <div className={isSignup
        ? 'relative mx-auto flex min-h-[calc(100dvh-18px)] w-full max-w-sm flex-col'
        : 'relative mx-auto flex h-full w-full max-w-sm flex-col'
      }>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute left-0 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm active:scale-95"
          aria-label="Retour à l’accueil"
        >
          <ArrowLeft size={21} />
        </button>

        <div className="mb-5 text-center">
          <BrandHeader safeArea={false} />
          <h1 className="font-display text-[28px] font-extrabold tracking-tight text-neutral-900">
            {isSignup ? 'Créer votre compte' : 'Ravi·e de vous revoir'}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-600">
            {isSignup
              ? 'Rejoignez un espace d’entraide pensé par et pour la communauté.'
              : 'Connectez-vous pour retrouver votre profil et vos échanges.'}
          </p>
        </div>

        <div className="rounded-[28px] border border-violet-200/60 bg-white p-5 shadow-[0_18px_55px_-24px_rgba(91,33,182,0.35)]">

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-neutral-700" htmlFor="email">Adresse e-mail</label>
              <div className="relative">
                <Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-12 pr-4 text-base text-neutral-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  placeholder="vous@exemple.fr"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-700" htmlFor="password">Mot de passe</label>
                {!isSignup && <button type="button" onClick={() => navigate('/mot-de-passe-oublie')} className="text-xs font-bold text-violet-700">Mot de passe oublié ?</button>}
              </div>
              <div className="relative">
                <LockKeyhole size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-12 pr-12 text-base text-neutral-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  placeholder={isSignup ? '6 caractères minimum' : 'Votre mot de passe'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div className="space-y-3 rounded-2xl bg-violet-50/70 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-violet-300 text-violet-700 focus:ring-violet-500"
                    required
                  />
                  <span className="text-xs leading-relaxed text-neutral-600">
                    J'ai lu et j'accepte les{' '}
                    <a href="#/cgu" target="_blank" rel="noopener noreferrer" className="font-bold text-violet-700 underline underline-offset-2">
                      CGU
                    </a>{' '}
                    et la{' '}
                    <a href="#/confidentialite" target="_blank" rel="noopener noreferrer" className="font-bold text-violet-700 underline underline-offset-2">
                      politique de confidentialité
                    </a>
                    .
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border-t border-violet-200/70 pt-3">
                  <input
                    type="checkbox"
                    checked={acceptSensitiveData}
                    onChange={(e) => setAcceptSensitiveData(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-violet-300 text-violet-700 focus:ring-violet-500"
                    required
                  />
                  <span className="text-xs leading-relaxed text-neutral-600">
                    Je consens explicitement au traitement des données sensibles nécessaires à mon inscription dans
                    cet annuaire communautaire (article 9 du RGPD).
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !canSubmit} className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 px-4 font-bold text-white shadow-[0_10px_26px_-8px_rgba(109,40,217,0.65)] transition active:scale-[0.98] disabled:opacity-45">
              {loading ? 'Veuillez patienter…' : isSignup ? 'Créer mon compte' : 'Se connecter'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-600">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <button onClick={() => navigate('/connexion')} className="font-bold text-violet-700">
                  Se connecter
                </button>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <button onClick={() => navigate('/inscription')} className="font-bold text-violet-700">
                  Créer un compte
                </button>
              </>
            )}
          </p>
        </div>

        {!isSignup && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-neutral-800">Votre espace reste privé</p>
              <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
                Connexion sécurisée, données protégées et communauté modérée.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
