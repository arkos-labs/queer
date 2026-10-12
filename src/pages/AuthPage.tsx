import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandHeader } from '@/components/BrandHeader';
import { supabase } from '@/lib/supabase';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/appleSignIn';
import { signInWithGoogle } from '@/lib/googleSignIn';

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
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeResent, setCodeResent] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSignup = mode === 'signup';
  const canSubmit = !isSignup || (acceptTerms && acceptSensitiveData);

  // Connexion / inscription avec Apple (app iPhone). Un nouveau compte passe ensuite par l'onboarding.
  const onApple = async () => {
    if (isSignup && !(acceptTerms && acceptSensitiveData)) {
      setError('Veuillez accepter les CGU et le consentement ci-dessus pour continuer avec Apple.');
      return;
    }
    setError(null);
    setAppleLoading(true);
    const res = await signInWithApple();
    if (res.error) {
      setAppleLoading(false);
      setError(res.error);
      return;
    }
    if (res.cancelled) {
      setAppleLoading(false);
      return;
    }
    // La session est créée : l'onboarding s'ouvre pour un nouveau profil, sinon l'annuaire.
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    let hasProfile = false;
    if (uid) {
      const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle();
      hasProfile = !!prof?.display_name;
    }
    setAppleLoading(false);
    navigate(hasProfile ? '/annuaire' : '/onboarding');
  };

  const onGoogle = async () => {
    if (isSignup && !(acceptTerms && acceptSensitiveData)) {
      setError('Veuillez accepter les CGU et le consentement ci-dessus pour continuer avec Google.');
      return;
    }
    setError(null);
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    if (res.error) {
      setGoogleLoading(false);
      setError(res.error);
      return;
    }
    if (res.cancelled) {
      setGoogleLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (uid) {
      const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle();
      setGoogleLoading(false);
      navigate(prof?.display_name ? '/annuaire' : '/onboarding');
    }
  };

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
        // Account exists but the e-mail was never confirmed: send a new code.
        if (res.error.toLowerCase().includes('not confirmed')) {
          await supabase.auth.resend({ type: 'signup', email });
          setConfirmationSent(true);
          return;
        }
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

  const confirmCode = async () => {
    if (code.trim().length < 6) return;
    setCodeBusy(true);
    setCodeError(null);
    const { error: verifyErr } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
    setCodeBusy(false);
    if (verifyErr) {
      setCodeError('Code incorrect ou expiré.');
      return;
    }

    // Rafraîchir la session après vérification du code
    // (verifyOtp ne met pas à jour automatiquement la session)
    await supabase.auth.getSession();

    setAccountCreated(true);
  };

  // Auto-redirect après 3 secondes
  useEffect(() => {
    if (accountCreated) {
      const timer = setTimeout(() => {
        navigate('/onboarding');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [accountCreated, navigate]);

  const resendCode = async () => {
    setCodeBusy(true);
    setCodeError(null);
    const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
    setCodeBusy(false);
    if (resendErr) {
      const wait = resendErr.message.match(/after (\d+) seconds/i);
      setCodeError(wait ? `Pour votre sécurité, patientez ${wait[1]} secondes avant de redemander un code.` : resendErr.message);
    } else setCodeResent(true);
  };

  if (accountCreated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#ede9fe] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-300 blur-lg" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600">
                  <Check size={48} className="text-white" />
                </div>
              </div>
            </div>

            <h1 className="font-display text-[32px] font-extrabold tracking-tight text-neutral-900">
              Bienvenue ! 🌈
            </h1>
            <p className="mx-auto mt-4 max-w-xs text-base leading-relaxed text-neutral-600">
              Votre compte Queer Services a bien été créé.
            </p>
          </div>

          <div className="rounded-[28px] border border-violet-200/60 bg-white p-6 shadow-[0_18px_55px_-24px_rgba(91,33,182,0.35)]">
            <div className="space-y-4 text-center">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                <Check size={20} className="shrink-0 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-green-900">Email vérifié</p>
                  <p className="text-sm text-green-700">{email}</p>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-sm text-neutral-600 mb-2">Chargement du profil...</p>
                <div className="flex gap-1 justify-center">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{animationDelay: '0ms'}} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{animationDelay: '150ms'}} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-500">
            Vous allez être redirigé vers votre profil dans quelques secondes…
          </p>
        </div>
      </div>
    );
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#ede9fe] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => setConfirmationSent(false)}
          className="mb-4 self-start flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-neutral-800 shadow-sm active:scale-95"
          aria-label="Retour"
        >
          <ArrowLeft size={21} />
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
              <MailCheck size={36} className="text-violet-700" />
            </div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-neutral-900">
              Vérifiez votre e-mail
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-neutral-600">
              Nous avons envoyé un code à <strong>{email}</strong>
            </p>
          </div>

          <div className="rounded-[28px] border border-violet-200/60 bg-white p-6 shadow-[0_18px_55px_-24px_rgba(91,33,182,0.35)]">
            <label className="mb-2 block text-xs font-bold text-neutral-700">Code de vérification</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              className="h-16 w-full rounded-2xl border-2 border-neutral-200 bg-neutral-50 text-center text-3xl font-bold tracking-[0.2em] text-neutral-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />

            {codeError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            {codeResent && !codeError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                <Check size={16} className="mt-0.5 shrink-0" />
                <span>Nouveau code envoyé à {email}</span>
              </div>
            )}

            <button
              onClick={confirmCode}
              disabled={codeBusy || code.length < 6}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-800 font-bold text-white shadow-[0_10px_26px_-8px_rgba(109,40,217,0.65)] transition active:scale-[0.98] disabled:opacity-45"
            >
              {codeBusy ? 'Vérification…' : 'Valider le code'}
              {!codeBusy && <ArrowRight size={18} />}
            </button>

            <p className="mt-5 text-center text-xs text-neutral-500">
              Rien reçu ? Vérifiez vos spams, ou{' '}
              <button onClick={resendCode} disabled={codeBusy} className="font-bold text-violet-700 disabled:opacity-50">
                renvoyer un code
              </button>
              .
            </p>
          </div>
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
                    . Je m'engage à ne publier aucun contenu injurieux, haineux ou abusif : tolérance zéro, les contenus signalés sont retirés et leurs auteur·rice·s exclu·e·s sous 24 h.
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

          <div className="mt-4">
            <div className="mb-4 flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" /> ou <span className="h-px flex-1 bg-neutral-200" />
            </div>
            <button
              type="button"
              onClick={onGoogle}
              disabled={googleLoading || loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 font-semibold text-neutral-800 transition active:scale-[0.98] disabled:opacity-45"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
              {googleLoading ? 'Connexion…' : isSignup ? 'S’inscrire avec Google' : 'Se connecter avec Google'}
            </button>
          </div>

          {isAppleSignInAvailable() && (
            <div className="mt-4">
              <div className="mb-4 flex items-center gap-3 text-xs text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200" /> ou <span className="h-px flex-1 bg-neutral-200" />
              </div>
              <button
                type="button"
                onClick={onApple}
                disabled={appleLoading || loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-45"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.85-2.1 1.5-3.16 1.42-.13-1.1.42-2.25 1.15-3 .82-.86 2.2-1.5 3.21-1.42zM20.5 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.38 3.52-4.1 3.54-1.53.02-1.93-1-4.01-.99-2.08.01-2.52 1.01-4.05.99-1.72-.02-3.04-1.78-4.03-3.35C-.01 15.9-.3 11 1.6 8.2c1.35-1.99 3.48-3.15 5.48-3.15 2.04 0 3.32 1.12 5 1.12 1.63 0 2.63-1.12 4.99-1.12 1.78 0 3.67.97 5.01 2.65-4.4 2.41-3.69 8.7-1.58 9.4z" />
                </svg>
                {appleLoading ? 'Connexion…' : isSignup ? 'S’inscrire avec Apple' : 'Se connecter avec Apple'}
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-500">
                En continuant avec Apple, vous acceptez les{' '}
                <a href="/cgu" className="font-semibold text-violet-700 underline">CGU</a> et la{' '}
                <a href="/confidentialite" className="font-semibold text-violet-700 underline">politique de confidentialité</a>.
              </p>
            </div>
          )}

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
