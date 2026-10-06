import { AvatarBadges, BadgeLegend } from '@/components/IdentityBadges';
import { useRealtimeRevision } from '@/lib/realtime';
import { useEffect, useState } from 'react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { PublicProfile, Badge, Review } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { SCREENSHOT_DEMO_PROFILES } from '@/lib/screenshotDemo';
import { StarRating } from '@/components/StarRating';
import { avg, timeAgo } from '@/lib/utils';
import {
  MapPin,
  Building2,
  Users,
  ArrowLeft,
  Flag,
  Send,
  X,
  ShieldCheck,
  Star,
  Linkedin,
  MessageSquare,
  Settings,
  UserMinus,
  Calendar,
  Box,
  Hammer,
  Heart,
  Check,
} from 'lucide-react';


interface ReviewWithAuthor extends Review {
  author?: { id: string; display_name: string; photo_url: string | null };
}

export function ProfileDetailPage({ id }: { id: string }) {
  const liveRevision = useRealtimeRevision('reviews', 'profile_subcategories', 'profile_badges', 'connections');
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [target, setTarget] = useState<PublicProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const demoProfile = SCREENSHOT_DEMO_PROFILES.find((profile) => profile.id === id);
      if (demoProfile) {
        setTarget(demoProfile);
        setBadges([]);
        setReviews([]);
        setLoading(false);
        return;
      }
      const [profRes, pbRes, revRes, blockRes] = await Promise.all([
        supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', id).maybeSingle(),
        supabase.from('profile_badges').select('badge:badges(*)').eq('profile_id', id),
        supabase
          .from('reviews')
          .select('*, author:profiles!reviews_author_id_fkey(id, display_name, photo_url)')
          .eq('target_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', id).maybeSingle(),
      ]);
      if (cancelled) return;
      setTarget(profRes.data as PublicProfile | null);
      setBadges(((pbRes.data ?? []) as unknown as { badge: Badge }[]).map((x) => x.badge).filter(Boolean));
      setReviews((revRes.data ?? []) as ReviewWithAuthor[]);
      setIsBlocked(!!blockRes.data);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id, navigate, liveRevision]);

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
      .order('created_at', { ascending: false })
      .limit(1)
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

  const toggleBlock = async () => {
    if (!user || !target) return;
    setActionLoading(true);
    const result = isBlocked
      ? await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', target.id)
      : await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: target.id });
    setActionLoading(false);
    if (result.error) {
      setActionDone('Erreur : ' + result.error.message);
      return;
    }
    setIsBlocked(!isBlocked);
    setActionDone(isBlocked ? 'Membre débloqué.' : 'Membre bloqué. Vous ne pourrez plus vous contacter.');
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
        <h2 className="font-display text-2xl font-semibold text-ink-base">Profil introuvable</h2>
        <p className="mt-2 text-ink-muted">Ce membre n'existe plus ou n'est pas accessible.</p>
        <button onClick={() => navigate('/annuaire')} className="mt-6 flex items-center justify-center rounded-xl bg-ink-base px-6 py-2.5 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 mx-auto">
          Retour à l'annuaire
        </button>
      </div>
    );
  }

  const isSelf = user?.id === target.id;

  if (target.id === 'demo-alex') return <DemoInesProfile />;

  const typeMeta = {
    particulier: { icon: Users, label: 'Particulier·e' },
    pro: { icon: Building2, label: 'Professionnel·le / entreprise' },
  }[target.account_type];

  return (
    <div className="animate-fade-in container-app pb-6 pt-0">
      <div className="flex flex-col gap-6">
          {/* Main Card */}
          <div className="rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm shadow-soft overflow-hidden pb-8 relative">
            {/* Elegant Kinpaku banner */}
            <div aria-hidden="true" className="h-28 sm:h-32 bg-paper-base relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1.5 z-10" style={{ background: 'linear-gradient(90deg, #FF0018 0%, #FFA52C 20%, #FFFF41 40%, #008018 60%, #0000F9 80%, #86007D 100%)' }} />
               <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-pink-500/10 blur-[50px]" />
               <div className="absolute -right-20 top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-[50px]" />
            </div>
            <div className="relative -mt-14 flex justify-center sm:-mt-16">
              <div className="rounded-full bg-white p-1.5 shadow-sm">
                <Avatar name={target.display_name} src={target.photo_url} size={112} className="bg-paper-raised text-ink-muted border border-gold-hairline" />
              </div>
              <AvatarBadges accountType={target.account_type} isCommunityMember={target.is_community_member} isAlly={target.is_ally} verified={target.verification_status === 'verified'} />
            </div>
            
            <div className="px-6 mt-6 text-center">
              <h1 className="font-display text-3xl font-bold text-ink-base">{target.account_type === 'pro' && target.company_name ? target.company_name : target.display_name}</h1>
              {target.account_type === 'pro' && target.company_name && target.company_name !== target.display_name && (
                <p className="mt-1 text-sm text-ink-muted">Représenté·e par {target.display_name}</p>
              )}
              <BadgeLegend accountType={target.account_type} isCommunityMember={target.is_community_member} isAlly={target.is_ally} verified={target.verification_status === 'verified'} className="mt-2" />

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                {target.city && (
                  <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-patina-deep" /> {target.city}</span>
                )}
              </div>

              {reviews.length > 0 && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-ink-base">
                  <Star size={15} className="fill-[#D4AF37] text-[#D4AF37]" /> {avgRating.toFixed(1)}
                  <span className="font-normal text-ink-muted">· {reviews.length} avis</span>
                </p>
              )}
              {target.linkedin_url && (
                <a href={target.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}

              {target.bio && (
                <p className="mt-6 text-[15px] italic text-ink-muted leading-relaxed whitespace-pre-line px-2">
                  "{target.bio}"
                </p>
              )}

              {target.account_type === 'pro' && (target.company_description || target.website_url || target.opening_hours || target.siret || target.intervention_zone) && (
                <div className="mt-6 rounded-2xl border border-gold-hairline bg-white p-4 text-left text-sm text-ink-base">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted"><Building2 size={14} /> L'entreprise</h3>
                  {target.company_description && <p className="whitespace-pre-line leading-relaxed">{target.company_description}</p>}
                  <dl className="mt-3 space-y-1.5 text-[13px]">
                    {target.intervention_zone && <div><dt className="inline font-semibold">Zone d'intervention : </dt><dd className="inline">{target.intervention_zone}</dd></div>}
                    {target.opening_hours && <div><dt className="inline font-semibold">Horaires : </dt><dd className="inline">{target.opening_hours}</dd></div>}
                    {target.siret && <div><dt className="inline font-semibold">SIRET : </dt><dd className="inline">{target.siret}</dd></div>}
                    {target.website_url && <div><dt className="inline font-semibold">Site web : </dt><dd className="inline"><a href={target.website_url} target="_blank" rel="noopener noreferrer" className="text-patina-deep underline">{target.website_url.replace(/^https?:\/\//, '')}</a></dd></div>}
                  </dl>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                {isSelf ? (
                   <button onClick={() => navigate('/profil/modifier')} className="flex items-center justify-center rounded-xl bg-ink-base px-6 py-2.5 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 w-full sm:w-auto">
                     Modifier mon profil
                   </button>
                ) : (
                  <>
                    <button onClick={() => setContactOpen(true)} disabled={isBlocked} className="flex items-center justify-center rounded-xl bg-ink-base px-6 py-2.5 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-50 w-full sm:w-auto">
                       <MessageSquare size={18} className="mr-1.5" /> {isBlocked ? 'Membre bloqué' : 'Message'}
                    </button>
                  </>
                )}
              </div>

              

              {target.account_type === 'pro' && (target.pro_services?.length ?? 0) > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">Services proposés</h3>
                  <ul className="space-y-2 text-left">
                    {target.pro_services!.map((svc, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-gold-hairline bg-white px-4 py-2.5 text-sm shadow-sm">
                        <span className="font-semibold text-ink-base">{svc.label}</span>
                        {svc.price && <span className="shrink-0 text-ink-muted">{svc.price}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {target.skills.length > 0 && !(target.account_type === 'pro' && (target.pro_services?.length ?? 0) > 0) && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">Compétences proposées</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {target.skills.map((s) => (
                      <span key={s} className="rounded-full bg-white border border-gold-hairline px-3 py-1 text-[11px] font-semibold text-ink-base shadow-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {target.needs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-3">Recherche</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {target.needs.map((s) => (
                      <span key={s} className="rounded-full bg-paper-base border border-gold-hairline px-3 py-1 text-[11px] font-semibold text-ink-base shadow-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                  
                </div>
              )}
            </div>
          </div>



          {/* Structure fields if applicable */}
          {target.intervention_zone && (
            <div className="rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-ink-base mb-4">Informations complémentaires</h2>
              <div className="flex flex-col gap-4 text-sm text-ink-muted">
                <div>
                  <span className="block text-xs text-patina-deep mb-1">Zone d'intervention</span>
                  <span className="font-medium text-ink-base">{target.intervention_zone}</span>
                </div>
              </div>
            </div>
          )}

          {/* Avis de la communauté */}
          <div className="rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm shadow-soft p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-ink-base">Avis de la communauté</h2>
            {reviews.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-ink-muted">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-gold-hairline pb-6 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <Avatar name={r.author?.display_name ?? 'Anonyme'} src={r.author?.photo_url} size={44} className="border border-gold-hairline bg-paper-base text-ink-muted" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-bold text-ink-base truncate pr-2">{r.author?.display_name ?? 'Anonyme'}</p>
                          <p className="text-[13px] font-medium text-patina-deep shrink-0">{timeAgo(r.created_at)}</p>
                        </div>
                        <div className="mt-0.5 text-[#D4AF37]">
                          <StarRating value={r.rating} size={13} />
                        </div>
                        {r.comment && <p className="mt-2.5 text-[15px] text-ink-base leading-relaxed">{r.comment}</p>}
                        {r.images && r.images.length > 0 && (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {r.images.map((imgUrl, idx) => (
                              <a href={imgUrl} target="_blank" rel="noopener noreferrer" key={idx} className="shrink-0">
                                <img src={imgUrl} alt="Photo de l'avis" className="h-20 w-20 rounded-lg object-cover border border-gold-hairline shadow-sm" loading="lazy" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isSelf && (
            <div className="flex items-center justify-center gap-6 pb-2 text-sm">
              <button onClick={toggleBlock} disabled={actionLoading} className="inline-flex items-center gap-1.5 font-medium text-ink-muted hover:text-ink-base">
                <UserMinus size={15} strokeWidth={1.5} /> {isBlocked ? 'Débloquer ce membre' : 'Bloquer ce membre'}
              </button>
              <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 font-medium text-error-600 hover:text-error-700">
                <Flag size={15} strokeWidth={1.5} /> Signaler
              </button>
            </div>
          )}
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

function DemoInesProfile() {
  const { navigate } = useRouter();
  const ines = SCREENSHOT_DEMO_PROFILES.find((profile) => profile.id === 'demo-alex')!;
  const services = [
    { icon: Box, title: 'Montage de meubles en kit', detail: 'IKEA, Leroy Merlin, Conforama… Lits, commodes, penderies modulaires.' },
    { icon: Hammer, title: 'Fixations murales & déco', detail: 'Perçage sûr, étagères, miroirs lourds, tringles et rideaux.' },
    { icon: WrenchIcon, title: 'Petits travaux & ajustements', detail: 'Poignées de portes, rabotage léger, joints et finitions soignées.' },
  ];
  return (
    <div className="min-h-screen bg-paper-base pb-32 animate-fade-in">
      <div className="sticky top-0 z-30 border-b border-gold-hairline bg-white/85 backdrop-blur-xl">
        <div className="container-app flex items-center justify-between py-3">
          <button onClick={() => navigate('/annuaire')} aria-label="Retour à l’annuaire" className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-hairline bg-white text-ink-base shadow-soft"><ArrowLeft size={21} /></button>
          <h1 className="font-display text-lg font-bold text-ink-base">Profil</h1>
          <button aria-label="Signaler ce profil" className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-hairline bg-white text-ink-muted shadow-soft"><Flag size={18} /></button>
        </div>
      </div>

      <main className="container-app space-y-5 py-5">
        <section className="overflow-hidden rounded-[28px] border border-gold-hairline bg-white shadow-soft">
          <div className="h-20 bg-paper-base" style={{ background: 'linear-gradient(105deg, #fff9ec 0%, #f4efff 45%, #ecf9f3 100%)' }} />
          <div className="relative px-5 pb-6 text-center">
            <div className="-mt-12 inline-flex rounded-full bg-white p-1.5 shadow-card"><Avatar name={ines.display_name} src={ines.photo_url} size={96} className="border-2 border-white" /></div>
            <div className="-mt-6 ml-16 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-card"><Check size={16} strokeWidth={3} /></div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2"><h2 className="font-display text-3xl font-bold text-ink-base">Inès D.</h2><span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">Particulier·e</span></div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium text-ink-muted"><MapPin size={15} className="text-primary-600" /> Paris (11e) <span className="text-gold-hairline">•</span> Déplacement 5 km <span className="text-gold-hairline">•</span> </p>
            <blockquote className="mt-5 rounded-2xl border border-primary-100 bg-primary-50/40 px-5 py-4 text-[15px] italic leading-relaxed text-ink-muted">« Je donne un coup de main pour les petits travaux et le montage de meubles. Ponctuelle, soignée et outillée. »</blockquote>
            <button onClick={() => navigate('/messages/demo-connection-hugo')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-base px-5 py-4 font-semibold text-white shadow-soft"><MessageSquare size={19} className="text-emerald-300" /> Envoyer un message</button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {[['RÉPONSE','< 1 h','● Très réactive'],['MISSIONS','38','100 % menées']].map(([label,value,caption]) => <div key={label} className="rounded-2xl border border-gold-hairline bg-white p-3 text-center shadow-soft"><p className="text-[10px] font-bold tracking-wide text-ink-muted">{label}</p><p className="mt-1 font-display text-xl font-bold text-ink-base">{value}</p><p className={`mt-1 text-[11px] font-medium ${label === 'RÉPONSE' ? 'text-emerald-600' : 'text-primary-700'}`}>{caption}</p></div>)}
        </section>

        <section className="rounded-[28px] border border-gold-hairline bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-base">Compétences & services</h2><span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">3 prestations</span></div><div className="mt-4 space-y-3">{services.map((service) => <div key={service.title} className="flex gap-3 rounded-2xl bg-primary-50/45 p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm"><service.icon size={19} /></div><div className="min-w-0 flex-1"><div className="flex gap-2"><h3 className="flex-1 text-sm font-bold text-ink-base">{service.title}</h3></div><p className="mt-1 text-xs leading-relaxed text-ink-muted">{service.detail}</p></div></div>)}</div><p className="mt-4 flex items-center gap-2 text-xs font-medium text-ink-muted"><Check size={15} className="text-emerald-600" /> Outillage personnel complet inclus</p></section>

        <section className="rounded-[28px] border border-gold-hairline bg-white p-5 shadow-soft"><h2 className="font-display text-lg font-bold text-ink-base">Confiance & sécurité</h2><div className="mt-4 space-y-3">{[['Compte vérifié','E-mail confirmé par code','Validé'],['Charte d’inclusion','Engagement safe space','Acceptée'],['Notes de la communauté','4,8 · 12 avis','Excellent']].map(([title,detail,state]) => <div key={title} className="flex items-center gap-3"><ShieldCheck size={20} className="text-primary-600" /><div className="flex-1"><p className="text-sm font-semibold text-ink-base">{title}</p><p className="text-xs text-ink-muted">{detail}</p></div><span className="text-xs font-bold text-emerald-600">{state}</span></div>)}</div><p className="mt-4 text-[11px] leading-relaxed text-ink-muted">Ces indicateurs sont des repères communautaires et ne remplacent pas une vérification professionnelle officielle.</p></section>

        <section className="rounded-[28px] border border-gold-hairline bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-base">Avis de la communauté</h2><span className="text-sm font-bold text-primary-700">4,8 ★ · 12 avis</span></div><p className="mt-3 text-sm leading-relaxed text-ink-muted">« Très ponctuelle et méticuleuse, le meuble est parfaitement monté. »</p><p className="mt-2 text-xs font-semibold text-ink-base">Camille R. · il y a 2 semaines</p></section>

      </main>
      <div className="fixed bottom-[calc(61px+env(safe-area-inset-bottom))] z-30 w-full border-t border-gold-hairline bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center gap-3"><div className="flex-1"><p className="text-xs text-ink-muted">Disponible ce samedi</p><p className="font-bold text-ink-base">Échanger avec ce membre</p></div><button onClick={() => navigate('/messages/demo-connection-hugo')} className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white shadow-soft"><Calendar size={17} /> Réserver</button></div></div>
    </div>
  );
}

function WrenchIcon({ size }: { size?: number }) { return <Hammer size={size} />; }

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
