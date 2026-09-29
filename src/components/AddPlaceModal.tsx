import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Category, Subcategory } from '@/lib/types';
import { X, MapPin, AlertTriangle, CheckCircle2, ImagePlus, ChevronDown } from 'lucide-react';

export function AddPlaceModal({
  subcategories,
  categories,
  onClose,
  onSubmitted,
}: {
  subcategories: Subcategory[];
  categories: Category[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  const canSubmit = name.trim().length > 0 && city.trim().length > 0 && subcategoryId.length > 0 && !loading;
  const charterMissing = !profile?.charte_accepted;
  const placeCategories = categories.filter((category) =>
    ['shopping-bonnes-adresses', 'communaute-vie-lgbtq'].includes(category.slug),
  );

  const submit = async () => {
    if (!user || !name.trim()) return;
    if (charterMissing) {
      setResult({ ok: false, message: "Acceptez d'abord la charte de respect depuis votre profil pour proposer un lieu." });
      return;
    }
    setLoading(true);
    setResult(null);

    let photoUrl: string | null = null;
    if (photo) {
      const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('place-images')
        .upload(path, photo, { contentType: photo.type, upsert: false });
      if (uploadError) {
        setLoading(false);
        setResult({ ok: false, message: `Impossible d’envoyer la photo : ${uploadError.message}` });
        return;
      }
      photoUrl = supabase.storage.from('place-images').getPublicUrl(path).data.publicUrl;
    }

    const { data, error } = await supabase
      .from('places')
      .insert({
        submitted_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        subcategory_id: subcategoryId || null,
        photo_url: photoUrl,
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
    setPhoto(null);
    setPhotoPreview(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]" role="dialog" aria-modal="true" aria-labelledby="add-place-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div onTouchMove={(event) => event.stopPropagation()} className="relative z-10 w-full max-w-lg animate-slide-up overflow-y-auto overscroll-contain rounded-[26px] border border-white bg-white p-0 shadow-2xl touch-pan-y max-h-[72dvh]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white/95 px-5 py-4 backdrop-blur-sm">
          <h3 id="add-place-title" className="font-display text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <MapPin size={18} className="text-primary-600" /> Ajouter un lieu
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <p className="px-5 pt-3 text-[13px] leading-relaxed text-neutral-500">
          Une recommandation de la communauté, validée avant publication.
        </p>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label htmlFor="place-name" className="mb-1 block text-sm font-medium text-neutral-900">Nom du lieu *</label>
            <input id="place-name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ex. Le Comptoir Arc-en-Ciel" />
          </div>

          <div>
            <label htmlFor="place-subcategory" className="mb-1 block text-sm font-medium text-neutral-900">Type de lieu *</label>
            <select id="place-subcategory" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="input">
              <option value="">Choisir le type de lieu…</option>
              {placeCategories.map((category) => {
                const options = subcategories.filter((subcategory) => subcategory.category_id === category.id);
                return options.length ? (
                  <optgroup key={category.id} label={category.label}>
                    {options.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.label}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>

          <div>
            <label htmlFor="place-city" className="mb-1 block text-sm font-medium text-neutral-900">Ville *</label>
            <input id="place-city" value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Paris" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">Photo du lieu <span className="font-normal text-neutral-400">(optionnel)</span></label>
            <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-3 text-left transition-colors hover:bg-primary-50">
              {photoPreview ? <img src={photoPreview} alt="Aperçu du lieu" className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm"><ImagePlus size={20} /></span>}
              <span>
                <span className="block text-sm font-semibold text-neutral-900">{photo ? 'Changer la photo' : 'Ajouter une photo'}</span>
                <span className="mt-1 block text-xs leading-relaxed text-neutral-500">Depuis la galerie ou l’appareil photo</span>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 8 * 1024 * 1024) {
                    setResult({ ok: false, message: 'La photo doit faire moins de 8 Mo.' });
                    return;
                  }
                  setPhoto(file);
                  setPhotoPreview(URL.createObjectURL(file));
                  setResult(null);
                }}
              />
            </label>
          </div>

          <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl py-2 text-left text-sm font-semibold text-primary-700">
            Ajouter une description ou une adresse <ChevronDown size={17} className={detailsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {detailsOpen && (
            <div className="space-y-3 rounded-2xl bg-neutral-50 p-3 animate-fade-in">
              <div>
                <label htmlFor="place-description" className="mb-1 block text-sm font-medium text-neutral-900">Description</label>
                <textarea id="place-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" placeholder="Pourquoi le recommander ?" />
              </div>
              <div>
                <label htmlFor="place-address" className="mb-1 block text-sm font-medium text-neutral-900">Adresse</label>
                <input id="place-address" value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="12 rue de la Paix" />
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className={
            'mx-5 mb-4 flex items-start gap-2 rounded-xl p-3 text-sm ' +
            (result.ok ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-800')
          }>
            {result.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="sticky bottom-0 flex gap-2 border-t border-neutral-100 bg-white/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <button onClick={onClose} className="btn-ghost">Fermer</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary flex-1">
            {loading ? 'Envoi…' : 'Proposer ce lieu'}
          </button>
        </div>
      </div>
    </div>
  );
}
