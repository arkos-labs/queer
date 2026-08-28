import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Place, PlaceReview } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { StarRating, AverageStars } from '@/components/StarRating';
import { avg, timeAgo } from '@/lib/utils';
import { ArrowLeft, MapPin, Clock, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';

interface PlaceReviewWithAuthor extends PlaceReview {
  author?: { id: string; display_name: string; photo_url: string | null };
}

export function PlaceDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<PlaceReviewWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [placeRes, reviewsRes] = await Promise.all([
        supabase.from('places').select('*, submitter:profiles!places_submitted_by_fkey(id, display_name, photo_url), subcategory:subcategories(id, label)').eq('id', id).maybeSingle(),
        supabase
          .from('place_reviews')
          .select('*, author:profiles!place_reviews_author_id_fkey(id, display_name, photo_url)')
          .eq('place_id', id)
          .order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setPlace(placeRes.data as Place | null);
      setReviews((reviewsRes.data ?? []) as PlaceReviewWithAuthor[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  const approvedReviews = reviews.filter((r) => r.status === 'approved');
  const myReview = reviews.find((r) => r.author_id === user?.id);
  const avgRating = avg(approvedReviews.map((r) => r.rating));

  const submitReview = async () => {
    if (!user || !place || rating === 0) return;
    if (!profile?.charte_accepted) {
      setReviewResult({ ok: false, message: "Acceptez d'abord la charte de respect depuis votre profil pour laisser un avis." });
      return;
    }
    setReviewLoading(true);
    setReviewResult(null);

    const { data, error } = await supabase
      .from('place_reviews')
      .insert({ place_id: place.id, author_id: user.id, rating, comment: comment.trim() || null })
      .select('*, author:profiles!place_reviews_author_id_fkey(id, display_name, photo_url)')
      .single();

    setReviewLoading(false);

    if (error) {
      setReviewResult({ ok: false, message: error.message.includes('duplicate') ? 'Vous avez déjà laissé un avis sur ce lieu.' : 'Erreur : ' + error.message });
      return;
    }

    setReviews((prev) => [data as PlaceReviewWithAuthor, ...prev]);

    if (data.status === 'rejected') {
      setReviewResult({ ok: false, message: data.rejection_reason ?? "Cet avis n'a pas pu être publié." });
    } else {
      setReviewResult({ ok: true, message: 'Merci ! Votre avis sera visible une fois validé par la modération.' });
      setRating(0);
      setComment('');
    }
  };

  if (loading) {
    return (
      <div className="container-app py-16">
        <div className="card h-96 animate-pulse bg-neutral-100" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-neutral-900">Lieu introuvable</h2>
        <p className="mt-2 text-neutral-500">Ce lieu n'existe pas ou n'est pas accessible.</p>
        <button onClick={() => navigate('/annuaire')} className="btn-primary mt-6">Retour à l'annuaire</button>
      </div>
    );
  }

  const isSubmitter = user?.id === place.submitted_by;

  return (
    <div className="animate-fade-in">
      <div className="h-40 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 sm:h-48" />

      <div className="container-app">
        <button onClick={() => navigate('/annuaire')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600">
          <ArrowLeft size={16} /> Annuaire
        </button>

        <div className="-mt-24 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card overflow-hidden p-0">
              {place.photo_url && (
                <img src={place.photo_url} alt={place.name} className="h-56 w-full object-cover" loading="lazy" />
              )}
              <div className="p-6 md:p-8">
                {isSubmitter && place.status !== 'approved' && (
                  <div className={
                    'mb-4 flex items-start gap-2 rounded-xl p-3 text-sm ' +
                    (place.status === 'rejected' ? 'bg-warning-50 text-warning-800' : 'bg-neutral-100 text-neutral-500')
                  }>
                    {place.status === 'rejected' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Clock size={16} className="mt-0.5 shrink-0" />}
                    <span>
                      {place.status === 'pending'
                        ? 'Votre proposition est en attente de validation par la modération.'
                        : place.rejection_reason ?? 'Votre proposition a été rejetée par la modération.'}
                    </span>
                  </div>
                )}

                <h1 className="font-display text-2xl font-semibold text-neutral-900">{place.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  {place.subcategory?.label && <span>{place.subcategory.label}</span>}
                  {(place.address || place.city) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} /> {[place.address, place.city].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
                {approvedReviews.length > 0 && (
                  <div className="mt-3">
                    <AverageStars value={avgRating} count={approvedReviews.length} />
                  </div>
                )}

                {place.description && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Description</h3>
                    <p className="mt-2 whitespace-pre-line text-neutral-900">{place.description}</p>
                  </div>
                )}

                {place.submitter && (
                  <div className="mt-6 flex items-center gap-2 text-sm text-neutral-500">
                    <Avatar name={place.submitter.display_name} src={place.submitter.photo_url} size={24} />
                    Proposé par {place.submitter.display_name}
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="card mt-6 p-6 md:p-8">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-neutral-900">Avis de la communauté</h2>
                {approvedReviews.length > 0 && <AverageStars value={avgRating} count={approvedReviews.length} />}
              </div>

              {approvedReviews.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {approvedReviews.map((r) => (
                    <div key={r.id} className="border-b border-neutral-200 pb-5 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.author?.display_name ?? 'Anonyme'} src={r.author?.photo_url} size={36} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">{r.author?.display_name ?? 'Anonyme'}</p>
                          <p className="text-xs text-neutral-400">{timeAgo(r.created_at)}</p>
                        </div>
                        <StarRating value={r.rating} size={14} />
                      </div>
                      {r.comment && <p className="mt-3 text-sm text-neutral-900">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: leave a review */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20 p-6">
              <h3 className="font-display text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-primary-600" /> Laisser un avis
              </h3>

              {myReview ? (
                <div className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-500">
                  {myReview.status === 'approved' && 'Vous avez déjà laissé un avis sur ce lieu.'}
                  {myReview.status === 'pending' && 'Votre avis est en attente de validation par la modération.'}
                  {myReview.status === 'rejected' && (myReview.rejection_reason ?? "Votre avis n'a pas pu être publié.")}
                </div>
              ) : place.status !== 'approved' ? (
                <p className="mt-4 text-sm text-neutral-500">Les avis ouvrent une fois ce lieu validé par la modération.</p>
              ) : (
                <>
                  <div className="mt-4">
                    <StarRating value={rating} onChange={setRating} size={22} />
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="input mt-3"
                    placeholder="Votre expérience dans ce lieu…"
                  />
                  {reviewResult && (
                    <div className={
                      'mt-3 flex items-start gap-2 rounded-xl p-3 text-sm ' +
                      (reviewResult.ok ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-800')
                    }>
                      {reviewResult.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                      <span>{reviewResult.message}</span>
                    </div>
                  )}
                  <button onClick={submitReview} disabled={reviewLoading || rating === 0} className="btn-primary mt-4 w-full">
                    {reviewLoading ? 'Envoi…' : 'Envoyer mon avis'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
