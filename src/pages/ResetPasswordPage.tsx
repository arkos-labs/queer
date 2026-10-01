import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

export function ResetPasswordPage() {
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-black text-ink-base mb-2">Réinitialiser</h1>
        <p className="text-sm text-ink-muted mb-8">Entrez votre nouveau mot de passe</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              Mot de passe changé ! Redirection...
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-base mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                minLength={8}
                required
                className="w-full px-4 py-3 border border-gold-hairline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-base mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                minLength={8}
                required
                className="w-full px-4 py-3 border border-gold-hairline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-ink-muted text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Chargement...' : 'Changer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
