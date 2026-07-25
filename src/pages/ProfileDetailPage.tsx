import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Profile, Badge, Review } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BadgeList } from '@/components/BadgeChip';
import { TrustPanel } from '@/components/TrustPanel';
import { StarRating, AverageStars } from '@/components/StarRating';
import { avg, formatDate, timeAgo } from '@/lib/utils';
import {
  MapPin,
  Briefcase,
  Building2,
  Users,
  Mail,
  Phone,
  ArrowLeft,
  Flag,
  Send,
  X,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';

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
    pro: { icon: Briefcase, label: 'Professionnel·le' },
    asso: { icon: Building2, label: 'Association / structure' },
  }[target.account_type];

  return (
    <div className="animate-fade-in">
      {/* Cover */}
      <div className="h-40 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 sm:h-48" />

      <div className="container-app">
        <button onClick={() => navigate('/annuaire')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600">
          <ArrowLeft size={16} /> Annuaire
        </button>

        <div className="-mt-24 grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="card p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={target.display_name} src={target.photo_url} size={96} className="ring-4 ring-white" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-semibold text-neutral-900">{target.display_name}</h1>
                    {target.verification_status === 'verified' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200">
                        <ShieldCheck size={12} /> Identité vérifiée
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                    <span className="inline-flex items-center gap-1.5">
                      <typeMeta.icon size={14} /> {typeMeta.label}
                    </span>
                    {target.civilite && <span>· {target.civilite}</span>}
                    {target.pronouns && <span>· {target.pronouns}</span>}
                    {target.city && (
                      <span className="inline-flex items-center gap-1.5">
                        · <MapPin size={14} /> {target.city}
                      </span>
                    )}
                  </div>
                  {reviews.length > 0 && (
                    <div className="mt-3">
                      <AverageStars value={avgRating} count={reviews.length} />
                    </div>
                  )}
                </div>
              </div>

              {target.bio && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">À propos</h3>
                  <p className="mt-2 whitespace-pre-line text-neutral-700">{target.bio}</p>
                </div>
              )}

              {target.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Compétences proposées</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {target.skills.map((s) => (
                      <span key={s} className="rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {target.needs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Recherche</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {target.needs.map((s) => (
                      <span key={s} className="rounded-full bg-secondary-50 px-3 py-1.5 text-sm font-medium text-secondary-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro fields */}
              {target.account_type !== 'particulier' && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {target.siret && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">SIRET</h3>
                      <p className="mt-1 text-sm text-neutral-700">{target.siret}</p>
                    </div>
                  )}
                  {target.intervention_zone && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Zone d'intervention</h3>
                      <p className="mt-1 text-sm text-neutral-700">{target.intervention_zone}</p>
                    </div>
                  )}
                  {target.indicative_rates && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Tarifs indicatifs</h3>
                      <p className="mt-1 text-sm text-neutral-700">{target.indicative_rates}</p>
                    </div>
                  )}
                </div>
              )}

              {badges.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Badges</h3>
                  <div className="mt-3">
                    <BadgeList badges={badges} />
                  </div>
                </div>
              )}
            </div>

            {/* Trust & safety */}
            <div className="mt-6">
              <TrustPanel profile={target} badges={badges} reviewCount={reviews.length} avgRating={avgRating} />
            </div>

            {/* Reviews */}
            <div className="card mt-6 p-6 md:p-8">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-neutral-900">Avis de la communauté</h2>
                {reviews.length > 0 && <AverageStars value={avgRating} count={reviews.length} />}
              </div>

              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-neutral-100 pb-5 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.author?.display_name ?? 'Anonyme'} src={r.author?.photo_url} size={36} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">{r.author?.display_name ?? 'Anonyme'}</p>
                          <p className="text-xs text-neutral-400">{timeAgo(r.created_at)}</p>
                        </div>
                        <StarRating value={r.rating} size={14} />
                      </div>
                      {r.comment && <p className="mt-3 text-sm text-neutral-700">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20 p-6">
              {isSelf ? (
                <div className="text-center">
                  <p className="text-sm text-neutral-500">C'est votre profil public.</p>
                  <button onClick={() => navigate('/profil/modifier')} className="btn-primary mt-4 w-full">
                    Modifier mon profil
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-lg font-semibold text-neutral-900">Contacter {target.display_name.split(' ')[0]}</h3>
                  <p className="mt-1 text-sm text-neutral-500">Lancez une mise en relation. Le respect de la charte s'applique.</p>

                  <button onClick={() => setContactOpen(true)} className="btn-primary mt-5 w-full">
                    <MessageCircle size={16} /> Envoyer un message
                  </button>
                  <button onClick={() => setReportOpen(true)} className="btn-ghost mt-2 w-full text-error-600 hover:bg-error-50">
                    <Flag size={16} /> Signaler ce profil
                  </button>

                  {target.email && (
                    <a href={`mailto:${target.email}`} className="mt-4 flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600">
                      <Mail size={14} /> {target.email}
                    </a>
                  )}
                  {target.phone && (
                    <a href={`tel:${target.phone}`} className="mt-2 flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600">
                      <Phone size={14} /> {target.phone}
                    </a>
                  )}

                  <div className="mt-6 border-t border-neutral-100 pt-4 text-xs text-neutral-400">
                    Membre depuis le {formatDate(target.created_at)}
                  </div>
                </>
              )}
            </div>
          </div>
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
