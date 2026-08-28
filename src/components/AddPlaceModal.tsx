import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Subcategory } from '@/lib/types';
import { X, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function AddPlaceModal({
  subcategories,
  onClose,
  onSubmitted,
}: {
  subcategories: Subcategory[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const canSubmit = name.trim().length > 0 && !loading;
  const charterMissing = !profile?.charte_accepted;

  const submit = async () => {
    if (!user || !name.trim()) return;
    if (charterMissing) {
      setResult({ ok: false, message: "Acceptez d'abord la charte de respect depuis votre profil pour proposer un lieu." });
      return;
    }
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase
      .from('places')
      .insert({
        submitted_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        subcategory_id: subcategoryId || null,
        photo_url: photoUrl.trim() || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      setResult({ ok: false, message: 'Erreur : ' + error.message });
      return;
    }

    if (data.status === 'rejected') {
      setResult({
        ok: false,
        message: data.rejection_reason ?? "Ce contenu n'a pas pu être publié.",
      });
      return;
    }

    setResult({ ok: true, message: 'Merci ! Votre lieu a été soumis et sera visible dans l’annuaire une fois validé par la modération.' });
    onSubmitted();
    setName('');
    setDescription('');
    setAddress('');
    setCity('');
    setSubcategoryId('');
    setPhotoUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-place-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-lg animate-scale-in p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 id="add-place-title" className="font-display text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <MapPin size={18} className="text-primary-600" /> Proposer un lieu
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-500">
          Recommandez un restaurant, un bar, une boutique… inclusif ou allié. Votre proposition sera vérifiée par la modération avant publication.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="place-name" className="mb-1 block text-sm font-medium text-neutral-900">Nom du lieu *</label>
            <input id="place-name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ex. Le Comptoir Arc-en-Ciel" />
          </div>

          <div>
            <label htmlFor="place-subcategory" className="mb-1 block text-sm font-medium text-neutral-900">Type de lieu</label>
            <select id="place-subcategory" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="input">
              <option value="">Choisir…</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="place-description" className="mb-1 block text-sm font-medium text-neutral-900">Description</label>
            <textarea id="place-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" placeholder="Pourquoi le recommander ?" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="place-address" className="mb-1 block text-sm font-medium text-neutral-900">Adresse</label>
              <input id="place-address" value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="12 rue de la Paix" />
            </div>
            <div>
              <label htmlFor="place-city" className="mb-1 block text-sm font-medium text-neutral-900">Ville</label>
              <input id="place-city" value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Paris" />
            </div>
          </div>

          <div>
            <label htmlFor="place-photo" className="mb-1 block text-sm font-medium text-neutral-900">Photo (URL, optionnel)</label>
            <input id="place-photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="input" placeholder="https://…" />
          </div>
        </div>

        {result && (
          <div className={
            'mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ' +
            (result.ok ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-800')
          }>
            {result.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Fermer</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary">
            {loading ? 'Envoi…' : 'Proposer ce lieu'}
          </button>
        </div>
      </div>
    </div>
  );
}
