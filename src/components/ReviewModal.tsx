import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StarRating } from '@/components/StarRating';
import { X, AlertTriangle } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError('Choisissez une note.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: insErr } = await supabase.from('reviews').insert({
      author_id: authorId,
      target_id: targetId,
      connection_id: connectionId,
      rating,
      comment: comment.trim() || null,
    });
    setLoading(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
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
          <label htmlFor="review-comment" className="mb-1 block text-sm font-medium text-neutral-700">Commentaire (optionnel)</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="input"
            placeholder="Comment s'est passée la prestation ?"
          />
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
