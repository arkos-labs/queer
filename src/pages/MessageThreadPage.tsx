import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Connection, Message, Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ReviewOfferCard } from '@/components/ReviewOfferCard';
import { ReviewModal } from '@/components/ReviewModal';
import { formatDate, timeAgo } from '@/lib/utils';
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, Flag, AlertTriangle } from 'lucide-react';

const STATUS_META: Record<Connection['status'], { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', cls: 'bg-warning-100 text-warning-700', icon: Clock },
  accepted: { label: 'Acceptée', cls: 'bg-primary-100 text-primary-600', icon: CheckCircle2 },
  completed: { label: 'Terminée', cls: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', cls: 'bg-neutral-100 text-neutral-500', icon: XCircle },
};


export function MessageThreadPage({ id }: { id: string }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

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
        if (connRes.error || !conn || (conn.user_a !== user.id && conn.user_b !== user.id)) {
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
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, user, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // The header (name row + optional payment banner + optional action row)
  // and footer (composer) are fixed-position, so the scrollable message list
  // needs matching padding — but their heights change depending on
  // connection/payment state. A hardcoded pixel padding drifts out of sync
  // and clips the first/last messages behind the fixed bars, so measure the
  // real rendered heights instead.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const footer = footerRef.current;
    if (!header || !footer) return;
    const update = () => {
      setHeaderHeight(header.offsetHeight);
      setFooterHeight(footer.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    ro.observe(footer);
    return () => ro.disconnect();
  }, [connection?.status, profile?.charte_accepted, alreadyReviewed]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !connection || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    const text = body.trim();
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
    if (!upErr) setConnection({ ...connection, status });
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
  const isPayer = payment ? payment.payer_id === user.id : isInitiator;
  const statusMeta = STATUS_META[connection.status];

  type TimelineItem = { kind: 'message'; data: Message; created_at: string };
  const timeline: TimelineItem[] = messages
    .map((m) => ({ kind: 'message' as const, data: m, created_at: m.created_at }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col animate-fade-in min-h-screen bg-paper-base">
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
      <div ref={headerRef} className="fixed top-[84px] z-40 mx-auto w-full max-w-6xl border-b border-gold-hairline bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/messages')} aria-label="Retour aux messages" className="rounded-full p-1.5 text-ink-muted hover:bg-paper-base">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => other && navigate(`/profil/${other.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar name={other?.display_name ?? 'Membre'} src={other?.photo_url} size={36} className="bg-paper-raised text-ink-muted border border-gold-hairline" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-base">{other?.display_name ?? 'Membre'}</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.cls}`}>
                <statusMeta.icon size={10} /> {statusMeta.label}
              </span>
            </div>
          </button>
        </div>

        {connection.status !== 'cancelled' && connection.status !== 'completed' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gold-hairline px-4 py-2 bg-white/40">
            {connection.status === 'pending' && !isInitiator && (
              <button
                onClick={() => updateStatus('accepted')}
                disabled={statusLoading}
                className="btn-outline btn-sm"
              >
                <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Accepter'}
              </button>
            )}
            {connection.status === 'accepted' && (
                <button onClick={() => updateStatus('completed')} disabled={statusLoading} className="btn-outline btn-sm">
                  <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Marquer terminée'}
                </button>
            )}
            <button onClick={() => updateStatus('cancelled')} disabled={statusLoading} className="btn-ghost btn-sm text-error-600 hover:bg-error-50">
              <XCircle size={14} /> Annuler
            </button>
          </div>
        )}

      </div>

      {/* Messages */}
      <div
        className="flex-1 space-y-3 px-4"
        style={{ paddingTop: headerHeight ? headerHeight + 12 : undefined, paddingBottom: footerHeight ? footerHeight + 12 : undefined }}
      >
        {timeline.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            Aucun message pour l'instant. Dites bonjour à {other?.display_name?.split(' ')[0] ?? 'ce membre'} !
          </p>
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
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm border border-gold-hairline ${
                          mine
                            ? 'rounded-br-sm bg-patina-deep text-white'
                            : 'rounded-bl-sm bg-white text-ink-base'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-patina-deep'}`}>{timeAgo(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
        {connection.status === 'completed' && (
          <ReviewOfferCard
            otherName={other?.display_name?.split(' ')[0] ?? 'l\'autre membre'}
            alreadyReviewed={alreadyReviewed}
            onReview={() => setReviewOpen(true)}
          />
        )}
        <div className="h-40" />
        <div ref={bottomRef} />
      </div>



      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* Composer */}
      <div ref={footerRef} className="fixed bottom-[calc(61px+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-6xl">
        {!profile?.charte_accepted ? (
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
              className="flex-1 resize-none rounded-xl border border-gold-hairline bg-white px-4 py-3 text-[15px] shadow-sm outline-none ring-gold-hairline focus:border-patina-deep focus:ring-1 max-h-28"
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
