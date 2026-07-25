import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Heart, AlertCircle, ArrowRight } from 'lucide-react';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = isSignup
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (isSignup) {
      navigate('/onboarding');
    } else {
      navigate('/annuaire');
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="absolute -left-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-secondary-200/30 blur-3xl" />

      <div className="w-full max-w-md animate-scale-in">
        <div className="card p-8 md:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-soft">
              <Heart size={26} fill="currentColor" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-neutral-900">
              {isSignup ? 'Rejoignez la communauté' : 'Bon retour parmi nous'}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
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

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Veuillez patienter…' : isSignup ? 'Créer mon compte' : 'Se connecter'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <button onClick={() => navigate('/connexion')} className="font-medium text-primary-600 hover:underline">
                  Se connecter
                </button>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <button onClick={() => navigate('/inscription')} className="font-medium text-primary-600 hover:underline">
                  Rejoindre la communauté
                </button>
              </>
            )}
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-400">
          En vous inscrivant, vous acceptez de respecter la charte communautaire de Queer Service.
        </p>
      </div>
    </div>
  );
}
