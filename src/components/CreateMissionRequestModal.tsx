import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PriceInput } from '@/components/PriceInput';
import { X, Send, AlertTriangle } from 'lucide-react';

interface CreateMissionRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMissionRequestModal({ onClose, onSuccess }: CreateMissionRequestModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetUnit, setBudgetUnit] = useState('/ prestation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!title.trim() || !description.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError(null);

    const finalBudget = budgetAmount.trim() ? `${budgetAmount.trim()}€ ${budgetUnit}` : null;

    const { error: insertErr } = await supabase.from('mission_requests').insert({
      created_by: user.id,
      title: title.trim(),
      description: description.trim(),
      budget: finalBudget,
    });

    setLoading(false);

    if (insertErr) {
      setError(insertErr.message || "Erreur lors de la publication de l'annonce.");
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Publier une annonce</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-neutral-900">
                Titre de la mission
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Aide pour monter un meuble IKEA"
                className="input w-full"
                maxLength={100}
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-neutral-900">
                Description et détails
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: J'aurais besoin d'aide ce samedi après-midi..."
                className="input w-full min-h-[120px] resize-y"
                maxLength={1000}
                required
              />
            </div>
            
            <div>
              <label htmlFor="budgetAmount" className="mb-1.5 block text-sm font-medium text-neutral-900">
                Budget proposé <span className="text-neutral-400 font-normal">(optionnel)</span>
              </label>
              <div className="flex gap-2">
                <PriceInput
                  id="budgetAmount"
                  value={budgetAmount}
                  onChange={setBudgetAmount}
                  placeholder="Ex: 50, entre 20 et 40…"
                  className="flex-1"
                />
                <select
                  value={budgetUnit}
                  onChange={(e) => setBudgetUnit(e.target.value)}
                  className="input w-auto shrink-0 bg-neutral-100"
                >
                  <option value="/ heure">/ heure</option>
                  <option value="/ jour">/ jour</option>
                  <option value="/ mois">/ mois</option>
                  <option value="/ prestation">/ prestation</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
              <AlertTriangle size={16} className="shrink-0" /> <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={loading || !title.trim() || !description.trim()} className="btn-primary">
              <Send size={18} /> {loading ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
