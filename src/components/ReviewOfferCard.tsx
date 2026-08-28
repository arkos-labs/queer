import { Star, CheckCircle2 } from 'lucide-react';

// Shown once a mission is 'completed', styled to match PaymentOfferCard
// (same size/shape/prominence) so the review prompt is just as visible
// in the conversation as a price offer was — not a small button buried
// in the header bar.
export function ReviewOfferCard({
  otherName,
  alreadyReviewed,
  onReview,
}: {
  otherName: string;
  alreadyReviewed: boolean;
  onReview: () => void;
}) {
  return (
    <div className="flex justify-center py-1">
      <div className="w-full max-w-sm rounded-2xl border border-accent-200 bg-accent-50/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-accent-700">
          <Star size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Prestation terminée</span>
        </div>

        {alreadyReviewed ? (
          <>
            <p className="mt-2 text-lg font-bold text-neutral-900">Avis envoyé</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-success-700">
              <CheckCircle2 size={13} /> Merci d'avoir partagé votre expérience avec {otherName}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg font-bold text-neutral-900">Comment s'est passée la prestation ?</p>
            <p className="mt-0.5 text-sm text-neutral-500">Donnez votre avis sur {otherName}, ça aide toute la communauté.</p>
            <button onClick={onReview} className="mt-3 btn-primary btn-sm">
              <Star size={14} /> Laisser un avis
            </button>
          </>
        )}
      </div>
    </div>
  );
}
