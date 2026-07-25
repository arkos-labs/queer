import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Profile, Badge, Review } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BadgeList } from '@/components/BadgeChip';
import { TrustPanel } from '@/components/TrustPanel';
import { StarRating, AverageStars } from '@/components/StarRating';
import { PaymentRequestModal } from '@/components/PaymentRequestModal';
import { avg, formatDate, timeAgo } from '@/lib/utils';
import {
  MapPin,
  Building2,
  Users,
  Mail,
  Phone,
  Clock,
  Calendar,
  ArrowLeft,
  Flag,
  Send,
  X,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
  Settings,
  CreditCard,
} from 'lucide-react';

const PAYMENTS_ENABLED = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

interface ReviewWithAuthor extends Review {
  author?: { id: string; display_name: string; photo_url: string | null };
}

export function ProfileDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [target, setTarget] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [profRes, pbRes, revRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('profile_badges').select('badge:badges(*)').eq('profile_id', id),
        supabase
          .from('reviews')
          .select('*, author:profiles!reviews_author_id_fkey(id, display_name, photo_url)')
          .eq('target_id', id)
          .order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setTarget(profRes.data as Profile | null);
      setBadges(((pbRes.data ?? []) as unknown as { badge: Badge }[]).map((x) => x.badge).filter(Boolean));
      setReviews((revRes.data ?? []) as ReviewWithAuthor[]);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  const avgRating = avg(reviews.map((r) => r.rating));

  const sendContact = async () => {
    if (!user || !target || !contactMsg.trim()) return;
    if (!profile?.charte_accepted) {
      setActionDone("Acceptez d'abord la charte de respect depuis votre profil pour pouvoir écrire.");
      return;
    }
    setActionLoading(true);

    // Reuse an existing conversation between the two members if there is one.
    const { data: existing, error: findErr } = await supabase
      .from('connections')
      .select('*')
      .or(`and(user_a.eq.${user.id},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${user.id})`)
      .maybeSingle();

    if (findErr) {
      setActionLoading(false);
      setActionDone('Erreur: ' + findErr.message);
      return;
    }

    let connectionId = existing?.id as string | undefined;

    if (!connectionId) {
      const { data: created, error: connErr } = await supabase
        .from('connections')
        .insert({
          user_a: user.id,
          user_b: target.id,
          service_label: contactMsg.trim().slice(0, 200),
          status: 'pending',
        })
        .select()
        .single();
      if (connErr) {
        setActionLoading(false);
        setActionDone('Erreur: ' + connErr.message);
        return;
      }
      connectionId = created.id as string;
    }

    const { error: msgErr } = await supabase
      .from('messages')
      .insert({ connection_id: connectionId, sender_id: user.id, body: contactMsg.trim() });

    setActionLoading(false);
    if (msgErr) {
      setActionDone('Erreur: ' + msgErr.message);
      return;
    }

    setContactOpen(false);
    setContactMsg('');
    navigate(`/messages/${connectionId}`);
  };

  const sendReport = async () => {
    if (!user || !target || !reportReason.trim()) return;
    setActionLoading(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'profile',
      target_id: target.id,
      reason: reportReason.trim(),
    });
    setActionLoading(false);
    if (error) {
      setActionDone('Erreur: ' + error.message);
      return;
    }
    setActionDone('Signalement envoyé. Merci pour votre vigilance.');
    setReportReason('');
    setTimeout(() => {
      setReportOpen(false);
      setActionDone(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="container-app py-16">
        <div className="card h-96 animate-pulse bg-neutral-100" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-neutral-900">Profil introuvable</h2>
        <p className="mt-2 text-neutral-500">Ce membre n'existe plus ou n'est pas accessible.</p>
        <button onClick={() => navigate('/annuaire')} className="btn-primary mt-6">
          Retour à l'annuaire
        </button>
      </div>
    );
  }

  const isSelf = user?.id === target.id;

  const typeMeta = {
    particulier: { icon: Users, label: 'Particulier·e' },
    asso: { icon: Building2, label: 'Association / structure' },
  }[target.account_type];

  return (
    <div className="animate-fade-in container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/annuaire')}
          aria-label="Retour à l'annuaire"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-lg font-semibold text-neutral-900">Profil</h1>
        {isSelf ? (
          <button
            onClick={() => navigate('/parametres')}
            aria-label="Réglages"
            title="Réglages"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
          >
            <Settings size={20} />
          </button>
        ) : (
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Signaler ce profil"
            title="Signaler ce profil"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-error-50 hover:text-error-600"
          >
            <Flag size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6">
          {/* Main Card */}
          <div className="card overflow-hidden pb-8 pt-8">
            <div className="flex justify-center relative">
              <Avatar name={target.display_name} src={target.photo_url} size={112} className="bg-primary-600 text-white" />
              {target.verification_status === 'verified' && (
                <div className="absolute bottom-0 right-1/2 translate-x-12 translate-y-1 rounded-full bg-white p-0.5 shadow-sm">
                  <ShieldCheck size={20} className="text-emerald-500 fill-emerald-50" />
                </div>
              )}
            </div>
            
            <div className="px-6 mt-6 text-center">
              <h1 className="font-display text-3xl font-bold text-neutral-900">{target.display_name}</h1>
              {typeMeta && (
                <span className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  {typeMeta.label}
                </span>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                {target.city && (
                  <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-error-500" /> {target.city}</span>
                )}
              </div>

              {target.bio && (
                <p className="mt-6 text-[15px] italic text-neutral-600 leading-relaxed whitespace-pre-line px-2">
                  "{target.bio}"
                </p>
              )}

              <div className="mt-6 flex items-center justify-center gap-3">
                {isSelf ? (
                   <button onClick={() => navigate('/profil/modifier')} className="btn-primary w-full">
                     Modifier mon profil
                   </button>
                ) : (
                  <>
                    <button onClick={() => setContactOpen(true)} className="btn-primary flex-1 font-semibold text-[15px]">
                       <MessageSquare size={18} className="mr-1.5" /> Message
                    </button>
                    {target.phone ? (
                      <a
                        href={`tel:${target.phone}`}
                        aria-label={`Appeler ${target.display_name}`}
                        title="Appeler"
                        className="inline-flex h-[44px] w-[56px] shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200"
                      >
                        <Phone size={18} />
                      </a>
                    ) : (
                      <span
                        aria-hidden
                        title="Téléphone non renseigné"
                        className="inline-flex h-[44px] w-[56px] shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-300"
                      >
                        <Phone size={18} />
                      </span>
                    )}
                  </>
                )}
              </div>

              {!isSelf && PAYMENTS_ENABLED && (
                target.stripe_charges_enabled ? (
                  <div className="mt-4">
                    {target.indicative_rates && (
                      <p className="mb-2 text-center text-xs text-neutral-500">
                        Tarifs indicatifs de {target.display_name} : <span className="font-medium text-neutral-700">{target.indicative_rates}</span>
                      </p>
                    )}
                    <button
                      onClick={() => setPaymentOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                    >
                      <CreditCard size={18} /> Demander un devis
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-left text-xs text-neutral-500">
                    <CreditCard size={16} className="shrink-0 text-neutral-400" />
                    <span>{target.display_name} n'a pas encore activé les paiements en ligne. Contactez-le·la par message pour convenir d'un prix.</span>
                  </div>
                )
              )}

              {target.skills.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 mb-3">Compétences proposées</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {target.skills.map((s) => (
                      <span key={s} className="rounded-md bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {target.needs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Recherche</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {target.needs.map((s) => (
                      <span key={s} className="rounded-md bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 border border-secondary-100">
                        {s}
                      </span>
                    ))}
                  </div>
                  {target.budget_indicatif && (
                    <p className="mt-3 text-center text-xs text-neutral-500">
                      Budget indicatif : <span className="font-medium text-neutral-700">{target.budget_indicatif}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>



          {/* Structure fields if applicable */}
          {target.intervention_zone && (
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">Informations complémentaires</h2>
              <div className="flex flex-col gap-4 text-sm text-neutral-600">
                <div>
                  <span className="block text-xs text-neutral-400 mb-1">Zone d'intervention</span>
                  <span className="font-medium text-neutral-900">{target.intervention_zone}</span>
                </div>
              </div>
            </div>
          )}

          <TrustPanel profile={target} badges={badges} reviewCount={reviews.length} avgRating={avgRating} />

          {/* Avis de la communauté */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">Avis de la communauté</h2>
            {reviews.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-500">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-neutral-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <Avatar name={r.author?.display_name ?? 'Anonyme'} src={r.author?.photo_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-bold text-neutral-900 truncate pr-2">{r.author?.display_name ?? 'Anonyme'}</p>
                          <p className="text-[13px] font-medium text-neutral-400 shrink-0">{timeAgo(r.created_at)}</p>
                        </div>
                        <div className="mt-0.5">
                          <StarRating value={r.rating} size={13} />
                        </div>
                        {r.comment && <p className="mt-2.5 text-[15px] text-neutral-700 leading-relaxed">{r.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges obtenus */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">Badges obtenus</h2>
            {badges.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun badge pour le moment.</p>
            ) : (
              <BadgeList badges={badges} className="gap-2" />
            )}
          </div>
        </div>

      {/* Contact modal */}
      {contactOpen && (
        <Modal onClose={() => setContactOpen(false)} title="Nouvelle mise en relation">
          <p className="text-sm text-neutral-500">
            Décrivez votre besoin. {target.display_name} recevra votre message.
          </p>
          <textarea
            value={contactMsg}
            onChange={(e) => setContactMsg(e.target.value)}
            rows={5}
            className="input mt-4"
            placeholder="Bonjour, je cherche de l'aide pour…"
          />
          {actionDone && <p className="mt-3 text-sm text-success-600">{actionDone}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setContactOpen(false)} className="btn-ghost">Annuler</button>
            <button onClick={sendContact} disabled={actionLoading || !contactMsg.trim()} className="btn-primary">
              {actionLoading ? 'Envoi…' : 'Envoyer'} <Send size={14} />
            </button>
          </div>
        </Modal>
      )}

      {/* Report modal */}
      {reportOpen && (
        <Modal onClose={() => setReportOpen(false)} title="Signaler ce profil">
          <p className="text-sm text-neutral-500">
            Expliquez le motif du signalement. Notre équipe de modération traitera votre demande.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={5}
            className="input mt-4"
            placeholder="Motif du signalement…"
          />
          {actionDone && <p className="mt-3 text-sm text-success-600">{actionDone}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setReportOpen(false)} className="btn-ghost">Annuler</button>
            <button onClick={sendReport} disabled={actionLoading || !reportReason.trim()} className="btn-secondary">
              {actionLoading ? 'Envoi…' : 'Signaler'} <Flag size={14} />
            </button>
          </div>
        </Modal>
      )}

      {/* Paid service request */}
      {paymentOpen && (
        <PaymentRequestModal target={target} onClose={() => setPaymentOpen(false)} />
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md animate-scale-in p-6">
        <div className="flex items-center justify-between">
          <h3 id="modal-title" className="font-display text-lg font-semibold text-neutral-900">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
