import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Connection, Message, Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ReviewOfferCard } from '@/components/ReviewOfferCard';
import { ReviewModal } from '@/components/ReviewModal';
import { formatDate, timeAgo } from '@/lib/utils';
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, Flag, AlertTriangle, Phone, ShieldCheck } from 'lucide-react';
import { SCREENSHOT_DEMO_PROFILES } from '@/lib/screenshotDemo';
import { BrandHeader } from '@/components/BrandHeader';
import { censorInsults } from '@/lib/profanity';
import { maskContactInfo } from '@/lib/contactMask';
import { useKeyboardOpen } from '@/lib/useKeyboardOpen';

const STATUS_META: Record<Connection['status'], { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', cls: 'bg-warning-100 text-warning-700', icon: Clock },
  accepted: { label: 'Acceptée', cls: 'bg-primary-100 text-primary-600', icon: CheckCircle2 },
  completed: { label: 'Terminée', cls: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', cls: 'bg-neutral-100 text-neutral-500', icon: XCircle },
};

export function MessageThreadPage({ id }: { id: string }) {
  if (id === 'demo-connection-hugo') return <DemoHugoThread />;
  return <LiveMessageThread id={id} />;
}

function LiveMessageThread({ id }: { id: string }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setError(null);
      try {
        const connRes = await supabase.from('connections').select('*').eq('id', id).maybeSingle();
        if (cancelled) return;
        const conn = connRes.data as Connection | null;
        if (connRes.error || !conn || (conn.user_a !== user.id && conn.user_b !== user.id && !profile?.is_admin)) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setConnection(conn);

        const otherId = conn.user_a === user.id ? conn.user_b : conn.user_a;
        const [otherRes, msgsRes, reviewRes] = await Promise.all([
          supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', otherId).maybeSingle(),
          supabase.from('messages').select('*').eq('connection_id', id).order('created_at', { ascending: true }),
          supabase
            .from('reviews')
            .select('id')
            .eq('connection_id', id)
            .eq('author_id', user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        setOther((otherRes.data ?? null) as Profile | null);
        const msgs = (msgsRes.data ?? []) as Message[];
        setMessages(msgs);
        setAlreadyReviewed(!!reviewRes.data);
        setLoading(false);

        const unreadIds = msgs.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
        if (unreadIds.length) {
          await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Impossible de charger la conversation.');
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`connection-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          if (newMessage.sender_id !== user.id) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMessage.id).then();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connections', filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Connection;
          setConnection(next);
          // Once the job is over, the phone number must disappear.
          if (next.status !== 'accepted') setContactPhone(null);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, user, navigate]);

  // The client sees the provider's number once the provider sent it
  // (and only while the mission is accepted).
  const otherId = other?.id;
  useEffect(() => {
    if (!user || !connection || !otherId) return;
    const iAmProvider = connection.user_b === user.id;
    if (iAmProvider || connection.status !== 'accepted' || !connection.phone_shared) return;
    let cancelled = false;
    supabase.rpc('get_contact_phone', { target_profile_id: otherId }).then(({ data }) => {
      if (!cancelled && data) setContactPhone(data as string);
    });
    return () => { cancelled = true; };
  }, [user, connection?.status, connection?.phone_shared, connection?.user_b, otherId]);

  useEffect(() => {
    const list = messagesRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);


  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !connection || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    const hideContacts = connection.status === 'pending' && connection.service_label !== 'Support Queer Service';
    const cleaned = censorInsults(body.trim());
    const text = hideContacts ? maskContactInfo(cleaned) : cleaned;
    const { data, error: sendErr } = await supabase
      .from('messages')
      .insert({ connection_id: connection.id, sender_id: user.id, body: text })
      .select()
      .single();
    setSending(false);
    if (sendErr) {
      setError(
        sendErr.message.includes('charte')
          ? "L'envoi de messages nécessite d'avoir accepté la charte de respect."
          : sendErr.message,
      );
      return;
    }
    setMessages((prev) => [...prev, data as Message]);
    setBody('');
  };

  const updateStatus = async (status: Connection['status']) => {
    if (!connection || !user) return;
    setError(null);
    setStatusLoading(true);

    const { error: upErr } = await supabase
      .from('connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', connection.id);
      
    setStatusLoading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setConnection({ ...connection, status });
    if (status !== 'accepted') setContactPhone(null);
  };

  // The provider (who accepted) is the only one who can send the number.
  const sharePhone = async () => {
    if (!connection || !user) return;
    setError(null);
    setStatusLoading(true);
    const { error: rpcErr } = await supabase.rpc('share_my_phone', { conn_id: connection.id });
    setStatusLoading(false);
    if (rpcErr) {
      setError(rpcErr.message.includes('téléphone') ? rpcErr.message : "Impossible d'envoyer votre numéro. Vérifiez qu'il est renseigné dans votre profil.");
      return;
    }
    setConnection({ ...connection, phone_shared: true });
  };

  if (!user) return null;

  if (notFound) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-neutral-900">Conversation introuvable</h2>
        <p className="mt-2 text-neutral-500">Elle n'existe plus ou vous n'y avez pas accès.</p>
        <button onClick={() => navigate('/messages')} className="btn-primary mt-6">Retour aux messages</button>
      </div>
    );
  }

  if (loading || !connection) {
    return <div className="container-app py-16"><div className="card h-96 animate-pulse bg-neutral-100" /></div>;
  }

  const isInitiator = connection.user_a === user.id;
  const isParticipant = connection.user_a === user.id || connection.user_b === user.id;
  const isProvider = connection.user_b === user.id;
  const isAdmin = !!profile?.is_admin;
  const isSupport = connection.service_label === 'Support Queer Service';
  const conversationName = isSupport ? 'Admin' : (other?.display_name ?? 'Membre');
  const statusMeta = STATUS_META[connection.status];

  type TimelineItem = { kind: 'message'; data: Message; created_at: string };
  const timeline: TimelineItem[] = messages
    .map((m) => ({ kind: 'message' as const, data: m, created_at: m.created_at }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className={`thread-shell ${keyboardOpen ? 'kb-open' : ''} z-40 flex flex-col overflow-hidden bg-paper-base`}>
      {reviewOpen && other && (
        <ReviewModal
          targetId={other.id}
          targetName={other.display_name}
          connectionId={connection.id}
          authorId={user.id}
          authorName={profile?.display_name ?? 'Un membre'}
          onClose={() => setReviewOpen(false)}
          onDone={() => {
            setReviewOpen(false);
            setAlreadyReviewed(true);
          }}
        />
      )}
      {/* Thread header */}
      <div className="z-10 w-full shrink-0 border-b border-gold-hairline bg-[#ede9fe]">
        <BrandHeader onBack={() => navigate('/messages')} />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={() => !isSupport && other && navigate(`/profil/${other.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            {isSupport ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"><ShieldCheck size={18} /></span> : <Avatar name={other?.display_name ?? 'Membre'} src={other?.photo_url} size={36} className="bg-paper-raised text-ink-muted border border-gold-hairline" />}
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold leading-tight text-ink-base">{conversationName}</p>
              {isSupport ? <span className="text-[11px] font-medium text-primary-700">Équipe Queer Services</span> : <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.cls}`}><statusMeta.icon size={10} /> {statusMeta.label}</span>}
            </div>
          </button>
        </div>

        {isSupport && isAdmin && connection.status !== 'completed' && connection.status !== 'cancelled' && (
          <div className="flex items-center gap-2 border-t border-gold-hairline bg-white/40 px-4 py-2">
            <button onClick={() => updateStatus('completed')} disabled={statusLoading} className="btn-primary btn-sm">
              <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Clôturer la demande'}
            </button>
          </div>
        )}
        {isSupport && (connection.status === 'completed' || connection.status === 'cancelled') && (
          <div className="border-t border-gold-hairline bg-success-50 px-4 py-2 text-center text-xs font-medium text-success-700">
            Cette demande est clôturée.
          </div>
        )}

        {!isSupport && isParticipant && connection.status !== 'cancelled' && connection.status !== 'completed' && (
          <div className="flex flex-col border-t border-gold-hairline bg-white/40">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2">
              {connection.status === 'pending' && !isInitiator && (
                <button
                  onClick={() => updateStatus('accepted')}
                  disabled={statusLoading}
                  className="btn-outline btn-sm"
                >
                  <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Accepter'}
                </button>
              )}
              {connection.status === 'pending' && isInitiator && (
                <span className="text-xs font-medium text-ink-muted">En attente de la réponse du prestataire…</span>
              )}
              {connection.status === 'accepted' && (
                  <button onClick={() => updateStatus('completed')} disabled={statusLoading} className="btn-outline btn-sm">
                    <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Marquer terminée'}
                  </button>
              )}
              <button onClick={() => updateStatus('cancelled')} disabled={statusLoading} className="btn-ghost btn-sm text-error-600 hover:bg-error-50">
                <XCircle size={14} /> {connection.status === 'pending' && !isInitiator ? 'Refuser' : 'Annuler'}
              </button>
            </div>

            {connection.status === 'accepted' && (
              <div className="flex items-center px-4 py-2 bg-primary-50 border-t border-gold-hairline">
                {isProvider ? (
                  connection.phone_shared ? (
                    <p className="text-xs font-medium text-primary-700 flex items-center gap-1.5">
                      <Phone size={14} /> Votre numéro a été envoyé. Il disparaîtra à la fin de la prestation.
                    </p>
                  ) : (
                    <button onClick={sharePhone} disabled={statusLoading} className="btn-primary btn-sm flex items-center gap-1.5">
                      <Phone size={14} /> Envoyer mon numéro
                    </button>
                  )
                ) : !connection.phone_shared ? (
                  <p className="text-xs font-medium text-primary-700 flex items-center gap-1.5">
                    <Phone size={14} /> Le prestataire peut vous envoyer son numéro maintenant que la mission est acceptée.
                  </p>
                ) : contactPhone ? (
                  <p className="text-sm font-medium text-primary-700 flex items-center gap-1.5">
                    <Phone size={14} /> Téléphone : <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="underline">{contactPhone}</a>
                  </p>
                ) : (
                  <p className="text-xs font-medium text-primary-700 flex items-center gap-1.5">
                    <Phone size={14} /> Récupération du numéro…
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5"
      >
        {timeline.length === 0 ? (
          isSupport ? <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-primary-100 bg-primary-50 p-4 text-center"><ShieldCheck size={22} className="mx-auto text-primary-600" /><p className="mt-2 text-sm font-semibold text-primary-900">Bonjour, comment pouvons-nous vous aider ?</p><p className="mt-1 text-xs leading-relaxed text-primary-700">Écrivez votre question à l’équipe. Nous vous répondrons ici.</p></div> : <p className="py-10 text-center text-sm text-ink-muted">Aucun message pour l'instant. Dites bonjour à {other?.display_name?.split(' ')[0] ?? 'ce membre'} !</p>
        ) : (
          timeline.map((item, i) => {
            const prev = timeline[i - 1];
            const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(item.created_at).toDateString();
            return (
              <div key={item.data.id}>
                {showDate && (
                  <p className="my-3 text-center text-xs font-medium text-patina-deep">{formatDate(item.created_at)}</p>
                )}
                {(() => {
                  const m = item.data;
                  const mine = m.sender_id === user.id;
                  return (
                    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[65%] rounded-2xl px-3 py-2 text-[13px] shadow-sm border border-gold-hairline ${
                          mine
                            ? 'rounded-br-sm bg-patina-deep text-white'
                            : 'rounded-bl-sm bg-white text-ink-base'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{connection.status === 'pending' && !isSupport ? maskContactInfo(censorInsults(m.body)) : censorInsults(m.body)}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-patina-deep'}`}>{timeAgo(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
        {!isSupport && connection.status === 'completed' && (
          <ReviewOfferCard
            otherName={other?.display_name?.split(' ')[0] ?? 'l\'autre membre'}
            alreadyReviewed={alreadyReviewed}
            onReview={() => setReviewOpen(true)}
          />
        )}
        <div ref={bottomRef} />
      </div>



      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="z-10 w-full shrink-0 bg-white">
        {isSupport && (connection.status === 'completed' || connection.status === 'cancelled') && !isAdmin ? (
          <div className="border-t border-gold-hairline bg-neutral-50 px-4 py-3 text-center text-xs text-ink-muted">Demande clôturée. Ouvrez une nouvelle demande si besoin.</div>
        ) : !profile?.charte_accepted ? (
          <div className="flex items-center gap-2 border-t border-gold-hairline bg-warning-50 px-4 py-3 text-xs text-warning-800">
            <Flag size={14} /> Acceptez la charte de respect depuis votre profil pour pouvoir écrire.
          </div>
        ) : (
          <form onSubmit={sendMessage} className="mx-auto flex max-w-6xl items-end gap-2 border-t border-gold-hairline bg-white/80 px-4 py-3 backdrop-blur-xl">
            <label htmlFor="thread-composer" className="sr-only">Votre message</label>
            <textarea
              id="thread-composer"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as unknown as FormEvent);
                }
              }}
              rows={1}
              placeholder="Écrire un message…"
              className="min-w-0 flex-1 resize-none rounded-xl border border-gold-hairline bg-white px-4 py-3 text-base shadow-sm outline-none ring-gold-hairline focus:border-patina-deep focus:ring-1 max-h-28"
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
            />
            <button type="submit" disabled={sending || !body.trim()} className="flex items-center justify-center rounded-xl bg-ink-base px-4 py-3 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 shrink-0" aria-label="Envoyer">
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function DemoHugoThread() {
  const { navigate } = useRouter();
  const keyboardOpen = useKeyboardOpen();
  const hugo = SCREENSHOT_DEMO_PROFILES.find((profile) => profile.id === 'demo-eden')!;
  const messages = [
    { mine: true, body: 'Bonjour Hugo, je cherche de l’aide samedi pour quelques cartons.', time: '15:42' },
    { mine: false, body: 'Bonjour ! Oui, je suis disponible samedi après-midi.', time: '15:48' },
    { mine: true, body: 'Super, merci. 14 h à Lille, ça te convient ?', time: '16:05' },
    { mine: false, body: 'Parfait, à samedi !', time: '16:20' },
  ];

  return (
    <div className={`thread-shell ${keyboardOpen ? 'kb-open' : ''} z-40 flex flex-col overflow-hidden bg-paper-base`}>
      <div className="z-10 w-full shrink-0 border-b border-gold-hairline bg-[#ede9fe]">
        <BrandHeader onBack={() => navigate('/messages')} />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/profil/demo-eden')} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar name={hugo.display_name} src={hugo.photo_url} size={36} className="border border-gold-hairline" />
            <div><p className="text-sm font-semibold text-ink-base">Hugo S.</p><span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-600"><CheckCircle2 size={10} /> Acceptée</span></div>
          </button>
        </div>
        <div className="border-t border-gold-hairline bg-primary-50 px-4 py-2 text-center text-xs font-medium text-primary-700">Aide pour un déménagement · Samedi à 14 h</div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5">
        <p className="my-3 text-center text-xs font-medium text-patina-deep">Aujourd’hui</p>
        {messages.map((message, index) => <div key={index} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl border border-gold-hairline px-4 py-2.5 text-sm shadow-sm ${message.mine ? 'rounded-br-sm bg-patina-deep text-white' : 'rounded-bl-sm bg-white text-ink-base'}`}><p>{message.body}</p><p className={`mt-1 text-[10px] ${message.mine ? 'text-white/80' : 'text-patina-deep'}`}>{message.time}</p></div></div>)}
      </div>
      <div className="z-10 flex w-full shrink-0 items-center gap-2 border-t border-gold-hairline bg-white px-4 py-3" >
        <div className="flex-1 rounded-xl border border-gold-hairline bg-white px-4 py-3 text-[15px] text-ink-muted">Écrire un message…</div><button aria-label="Envoyer" className="rounded-xl bg-ink-base p-3 text-white"><Send size={16} /></button>
      </div>
    </div>
  );
}
