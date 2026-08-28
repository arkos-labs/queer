import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StarRating } from '@/components/StarRating';
import { X, AlertTriangle, Camera, Upload, Trash2, Loader2 } from 'lucide-react';

// Left once a mission is marked 'completed' — either participant can
// review the other. Ties back to the connection so it only ever shows
// up once per finished prestation (see MessageThreadPage).
export function ReviewModal({
  targetId,
  targetName,
  connectionId,
  authorId,
  authorName,
  onClose,
  onDone,
}: {
  targetId: string;
  targetName: string;
  connectionId: string;
  authorId: string;
  authorName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const valid = selected.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
      if (valid.length !== selected.length) {
        setError('Certaines images sont invalides (format non supporté ou taille > 5Mo).');
      }
      setImages(prev => [...prev, ...valid].slice(0, 3)); // Max 3 images
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (rating < 1) {
      setError('Choisissez une note.');
      return;
    }
    setLoading(true);
    setError(null);
    
    let uploadedUrls: string[] = [];
    
    try {
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${authorId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('review-images')
            .upload(fileName, file);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('review-images')
            .getPublicUrl(fileName);
            
          uploadedUrls.push(publicUrl);
        }
      }
      
      const { error: insErr } = await supabase.from('reviews').insert({
        author_id: authorId,
        target_id: targetId,
        connection_id: connectionId,
        rating,
        comment: comment.trim() || null,
        images: uploadedUrls.length > 0 ? uploadedUrls : null,
      });
      
      if (insErr) throw insErr;
    setLoading(false);
      // Same idea as the payment-confirmation message: without this the
      // reviewed person only finds out by reopening the thread. Posting it
      // as a real message bumps the conversation to the top of their
      // Messages list and shows up as a notification to follow up on.
      await supabase.from('messages').insert({
        connection_id: connectionId,
        sender_id: authorId,
        body: `${authorName} vous a laissé un avis (${rating} étoile${rating > 1 ? 's' : ''})${comment.trim() ? ` : « ${comment.trim()} »` : '.'}`,
      });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la publication de l\'avis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md animate-scale-in p-6">
        <div className="flex items-center justify-between">
          <h3 id="review-title" className="font-display text-lg font-semibold text-neutral-900">
            Laisser un avis à {targetName}
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <StarRating value={rating} onChange={setRating} size={32} />
          <p className="text-xs text-neutral-400">
            {rating > 0 ? `${rating} étoile${rating > 1 ? 's' : ''}` : 'Touchez pour noter'}
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="review-comment" className="mb-1 block text-sm font-medium text-neutral-900">Commentaire (optionnel)</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Comment s'est passée la prestation ?"
          />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-neutral-900">Photos (optionnel, max 3)</label>
          {images.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {images.map((file, idx) => (
                <div key={idx} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 3 && (
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-100 py-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100 transition-colors">
              <Camera size={18} />
              <span>Ajouter une photo</span>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={submit} disabled={loading} className="btn-primary">
            {loading ? 'Envoi…' : "Publier l'avis"}
          </button>
        </div>
      </div>
    </div>
  );
}
