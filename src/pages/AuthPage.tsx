import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { AlertCircle, ArrowRight, MailCheck } from 'lucide-react';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptSensitiveData, setAcceptSensitiveData] = useState(false);
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
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12 bg-paper-base">
        <div className="w-full max-w-md animate-scale-in">
          <div className="rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-8 text-center md:p-10 shadow-soft">
            <MailCheck size={40} className="mx-auto mb-4 text-patina-deep" />
            <h1 className="font-display text-xl font-semibold text-ink-base">Vérifiez votre boîte mail</h1>
            <p className="mt-3 text-sm text-ink-muted">
              Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Cliquez dessus pour activer votre
              compte, vous pourrez ensuite compléter votre profil.
            </p>
            <p className="mt-4 text-xs text-patina-deep/70">
              Rien reçu ? Vérifiez vos spams, ou{' '}
              <button onClick={() => setConfirmationSent(false)} className="font-medium text-patina-deep hover:underline">
                réessayez
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12 bg-paper-base">
      <div className="absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="absolute -left-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="w-full max-w-md animate-scale-in">
        <div className="overflow-hidden rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm shadow-soft">
          <div aria-hidden className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #FF0018 0%, #FFA52C 20%, #FFFF41 40%, #008018 60%, #0000F9 80%, #86007D 100%)' }} />
          <div className="p-8 md:p-10">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="Queer Service" className="mx-auto mb-4 h-16 w-16 object-contain" />
            <h1 className="font-display text-2xl font-semibold text-ink-base">
              {isSignup ? 'Rejoignez la communauté' : 'Bon retour parmi nous'}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {isSignup
                ? 'Fait pour nous, par nous. Je suis parce que nous sommes.'
                : 'Connectez-vous pour accéder à l\'annuaire et vos échanges.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="vous@exemple.fr"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Au moins 6 caractères"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            {isSignup && (
              <div className="space-y-2.5 rounded-2xl bg-white border border-gold-hairline p-4 shadow-sm">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gold-hairline text-patina-deep focus:ring-patina-deep"
                    required
                  />
                  <span className="text-xs text-ink-muted">
                    J'ai lu et j'accepte les{' '}
                    <a href="#/cgu" target="_blank" rel="noopener noreferrer" className="font-semibold text-patina-deep hover:underline">
                      CGU
                    </a>{' '}
                    et la{' '}
                    <a href="#/confidentialite" target="_blank" rel="noopener noreferrer" className="font-semibold text-patina-deep hover:underline">
                      politique de confidentialité
                    </a>
                    .
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptSensitiveData}
                    onChange={(e) => setAcceptSensitiveData(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gold-hairline text-patina-deep focus:ring-patina-deep"
                    required
                  />
                  <span className="text-xs text-ink-muted">
                    Je comprends que mon inscription à cet annuaire communautaire implique le traitement de données
                    relatives à l'orientation sexuelle et/ou à l'identité de genre (catégorie particulière de
                    données), et j'y consens explicitement (art. 9 du RGPD).
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !canSubmit} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-base px-4 py-3 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
              {loading ? 'Veuillez patienter…' : isSignup ? 'Créer mon compte' : 'Se connecter'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <button onClick={() => navigate('/connexion')} className="font-semibold text-patina-deep hover:underline">
                  Se connecter
                </button>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <button onClick={() => navigate('/inscription')} className="font-semibold text-patina-deep hover:underline">
                  Rejoindre la communauté
                </button>
              </>
            )}
          </p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-patina-deep/70">
          En vous inscrivant, vous acceptez de respecter la charte communautaire de Queer Service.
          {' '}
          <a href="#/mentions-legales" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-muted">
            Mentions légales
          </a>
        </p>
      </div>
    </div>
  );
}
