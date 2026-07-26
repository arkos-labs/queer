import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase, edgeFunctionErrorMessage, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Connection, Message, Profile, Payment } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { PayNowModal } from '@/components/PayNowModal';
import { PaymentOfferCard } from '@/components/PaymentOfferCard';
import { ReviewModal } from '@/components/ReviewModal';
import { formatDate, timeAgo } from '@/lib/utils';
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, Flag, CreditCard, AlertTriangle, Star } from 'lucide-react';

const STATUS_META: Record<Connection['status'], { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', cls: 'bg-warning-100 text-warning-700', icon: Clock },
  accepted: { label: 'Acceptée', cls: 'bg-primary-100 text-primary-700', icon: CheckCircle2 },
  completed: { label: 'Terminée', cls: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', cls: 'bg-neutral-100 text-neutral-600', icon: XCircle },
};

const PAYMENT_STATUS_META: Record<Payment['status'], { label: string; cls: string }> = {
  pending: { label: 'En attente de paiement', cls: 'bg-warning-100 text-warning-700' },
  authorized: { label: 'Carte autorisée', cls: 'bg-primary-100 text-primary-700' },
  captured: { label: 'Payé', cls: 'bg-success-100 text-success-700' },
  canceled: { label: 'Paiement annulé', cls: 'bg-neutral-100 text-neutral-600' },
  failed: { label: 'Paiement échoué', cls: 'bg-error-100 text-error-700' },
  refunded: { label: 'Remboursé', cls: 'bg-neutral-100 text-neutral-600' },
};

const formatEuros = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function MessageThreadPage({ id }: { id: string }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(false);
  const [payNowSecret, setPayNowSecret] = useState<string | null>(null);
  const [cancelPaymentLoading, setCancelPaymentLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        const [otherRes, msgsRes, payRes, reviewRes] = await Promise.all([
          supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', otherId).maybeSingle(),
          supabase.from('messages').select('*').eq('connection_id', id).order('created_at', { ascending: true }),
          supabase
            .from('payments')
            .select('*')
            .eq('connection_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
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
        setPayment((payRes.data ?? null) as Payment | null);
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
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, payment?.status]);

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

  const payNow = async () => {
    if (!connection || !user) return;
    setError(null);
    setPayNowLoading(true);
    const { data, error: fnErr } = await supabase.functions.invoke('stripe-create-payment', {
      body: { connection_id: connection.id },
    });
    setPayNowLoading(false);
    if (fnErr) {
      setError(await edgeFunctionErrorMessage(fnErr, 'Impossible de préparer le paiement.'));
      return;
    }
    if (!data?.client_secret) {
      setError('Impossible de préparer le paiement.');
      return;
    }
    setPayNowSecret(data.client_secret);
  };

  const counterPayment = async (amountCents: number): Promise<string | null> => {
    if (!connection || !user) return 'Erreur.';
    const { data, error: fnErr } = await supabase.functions.invoke('stripe-counter-payment', {
      body: { connection_id: connection.id, amount: amountCents },
    });
    if (fnErr) return await edgeFunctionErrorMessage(fnErr, "Impossible d'envoyer la contre-offre.");
    if (data?.payment) setPayment(data.payment as Payment);
    return null;
  };

  const cancelPayment = async () => {
    if (!connection || !user || !payment) return;
    setError(null);
    setCancelPaymentLoading(true);
    const { error: fnErr } = await supabase.functions.invoke('stripe-manage-payment', {
      body: { connection_id: connection.id, action: 'cancel' },
    });
    setCancelPaymentLoading(false);
    if (fnErr) {
      setError(await edgeFunctionErrorMessage(fnErr, "Le paiement n'a pas pu être annulé."));
      return;
    }
    setPayment({ ...payment, status: 'canceled' });
  };

  const updateStatus = async (status: Connection['status']) => {
    if (!connection || !user) return;
    setError(null);

    // Money only moves when the client (payer) confirms completion — the
    // provider can never capture their own payment.
    if (status === 'completed' && payment && (payment.status === 'pending' || payment.status === 'authorized')) {
      if (payment.payer_id !== user.id) {
        setError('Seul·e le·la client·e qui a payé peut confirmer la fin de la prestation.');
        return;
      }
      if (payment.status === 'pending') {
        setError("Le paiement n'est pas encore confirmé — patientez avant de clôturer.");
        return;
      }
      setStatusLoading(true);
      const { error: fnErr } = await supabase.functions.invoke('stripe-manage-payment', {
        body: { connection_id: connection.id, action: 'capture' },
      });
      setStatusLoading(false);
      if (fnErr) {
        setError(await edgeFunctionErrorMessage(fnErr, "Le paiement n'a pas pu être capturé."));
        return;
      }
      setPayment({ ...payment, status: 'captured' });
    }

    if (status === 'cancelled' && payment && (payment.status === 'pending' || payment.status === 'authorized')) {
      setStatusLoading(true);
      const { error: fnErr } = await supabase.functions.invoke('stripe-manage-payment', {
        body: { connection_id: connection.id, action: 'cancel' },
      });
      setStatusLoading(false);
      if (fnErr) {
        setError(await edgeFunctionErrorMessage(fnErr, "Le paiement n'a pas pu être annulé."));
        return;
      }
      setPayment({ ...payment, status: 'canceled' });
    }

    const { error: upErr } = await supabase
      .from('connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', connection.id);
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

  type TimelineItem =
    | { kind: 'message'; data: Message; created_at: string }
    | { kind: 'payment'; data: Payment; created_at: string };
  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({ kind: 'message' as const, data: m, created_at: m.created_at })),
    ...(payment ? [{ kind: 'payment' as const, data: payment, created_at: payment.created_at }] : []),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col animate-fade-in">
      {payNowSecret && (
        <PayNowModal
          clientSecret={payNowSecret}
          connectionId={connection.id}
          onClose={() => setPayNowSecret(null)}
          onDone={() => {
            setPayNowSecret(null);
            if (payment) setPayment({ ...payment, status: 'authorized' });
          }}
        />
      )}
      {reviewOpen && other && (
        <ReviewModal
          targetId={other.id}
          targetName={other.display_name}
          connectionId={connection.id}
          authorId={user.id}
          onClose={() => setReviewOpen(false)}
          onDone={() => {
            setReviewOpen(false);
            setAlreadyReviewed(true);
          }}
        />
      )}
      {/* Thread header */}
      <div className="sticky top-20 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/messages')} aria-label="Retour aux messages" className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => other && navigate(`/profil/${other.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar name={other?.display_name ?? 'Membre'} src={other?.photo_url} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{other?.display_name ?? 'Membre'}</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.cls}`}>
                <statusMeta.icon size={10} /> {statusMeta.label}
              </span>
            </div>
          </button>
        </div>

        {payment && (
          <div className="flex items-center gap-2 border-t border-neutral-100 bg-neutral-50 px-4 py-2 text-xs">
            <CreditCard size={13} className="shrink-0 text-neutral-500" />
            <span className="font-semibold text-neutral-800">{formatEuros(payment.amount)}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${PAYMENT_STATUS_META[payment.status].cls}`}>
              {PAYMENT_STATUS_META[payment.status].label}
            </span>
            {payment.status === 'pending' && !payment.stripe_payment_intent_id && (
              <span className="text-neutral-400">
                {connection.status === 'accepted'
                  ? `en attente que ${isPayer ? 'vous payiez' : 'le client paye'}`
                  : `en attente que ${isPayer ? 'le·la prestataire accepte' : 'vous acceptiez'} la mission`}
              </span>
            )}
            {payment.status === 'pending' && payment.stripe_payment_intent_id && (
              <span className="text-neutral-400">paiement en cours de confirmation…</span>
            )}
            {payment.status === 'authorized' && (
              <span className="text-neutral-400">débité quand {isPayer ? 'vous confirmerez' : 'le client confirmera'} la fin de la prestation</span>
            )}
          </div>
        )}

        {connection.status !== 'cancelled' && connection.status !== 'completed' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-4 py-2">
            {connection.status === 'pending' && !isInitiator && !payment && (
              <button
                onClick={() => updateStatus('accepted')}
                disabled={statusLoading}
                className="btn-outline btn-sm"
              >
                <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Accepter'}
              </button>
            )}
            {connection.status === 'accepted' && payment && payment.status === 'pending' && !payment.stripe_payment_intent_id && (
              isPayer ? (
                <button onClick={payNow} disabled={payNowLoading} className="btn-primary btn-sm">
                  <CreditCard size={14} /> {payNowLoading ? 'Préparation…' : 'Payer maintenant'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
                  <Clock size={13} /> En attente que le client règle le paiement
                </span>
              )
            )}
            {connection.status === 'accepted' && payment && payment.status === 'pending' && payment.stripe_payment_intent_id && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
                <Clock size={13} /> Paiement en cours de confirmation…
              </span>
            )}
            {connection.status === 'accepted' && (!payment || payment.status === 'authorized') && (
              payment && !isPayer ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
                  <Clock size={13} /> En attente que le client confirme la fin de la prestation
                </span>
              ) : (
                <button onClick={() => updateStatus('completed')} disabled={statusLoading} className="btn-outline btn-sm">
                  <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : payment ? 'Confirmer la fin & payer' : 'Marquer terminée'}
                </button>
              )
            )}
            <button onClick={() => updateStatus('cancelled')} disabled={statusLoading} className="btn-ghost btn-sm text-neutral-500">
              <XCircle size={14} /> Annuler
            </button>
          </div>
        )}

        {connection.status === 'completed' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-4 py-2">
            {alreadyReviewed ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
                <Star size={13} className="fill-accent-400 text-accent-400" /> Avis envoyé
              </span>
            ) : (
              <button onClick={() => setReviewOpen(true)} className="btn-outline btn-sm">
                <Star size={14} /> Laisser un avis
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 px-4 pt-4">
        {timeline.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Aucun message pour l'instant. Dites bonjour à {other?.display_name?.split(' ')[0] ?? 'ce membre'} !
          </p>
        ) : (
          timeline.map((item, i) => {
            const prev = timeline[i - 1];
            const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(item.created_at).toDateString();
            return (
              <div key={item.kind === 'message' ? item.data.id : `payment-${item.data.id}`}>
                {showDate && (
                  <p className="my-3 text-center text-xs font-medium text-neutral-400">{formatDate(item.created_at)}</p>
                )}
                {item.kind === 'payment' ? (
                  <PaymentOfferCard
                    payment={item.data}
                    connectionStatus={connection.status}
                    currentUserId={user.id}
                    otherName={other?.display_name?.split(' ')[0] ?? 'l\'autre membre'}
                    isPayer={isPayer}
                    statusLoading={statusLoading}
                    payNowLoading={payNowLoading}
                    onAccept={() => updateStatus('accepted')}
                    onRefuse={() => updateStatus('cancelled')}
                    onPayNow={payNow}
                    onCompleteAndPay={() => updateStatus('completed')}
                    onCounter={counterPayment}
                    onCancelPayment={cancelPayment}
                    cancelLoading={cancelPaymentLoading}
                  />
                ) : (
                  (() => {
                    const m = item.data;
                    const mine = m.sender_id === user.id;
                    return (
                      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine
                              ? 'rounded-br-sm bg-primary-600 text-white'
                              : 'rounded-bl-sm bg-neutral-100 text-neutral-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-primary-100' : 'text-neutral-400'}`}>{timeAgo(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })
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
      {!profile?.charte_accepted ? (
        <div className="sticky bottom-20 z-30 flex items-center gap-2 border-t border-neutral-200 bg-warning-50 px-4 py-3 text-xs text-warning-800">
          <Flag size={14} /> Acceptez la charte de respect depuis votre profil pour pouvoir écrire.
        </div>
      ) : (
        <form onSubmit={sendMessage} className="sticky bottom-20 z-30 flex items-end gap-2 border-t border-neutral-200 bg-white px-4 py-3">
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
            className="input max-h-28 flex-1 resize-none"
          />
          <button type="submit" disabled={sending || !body.trim()} className="btn-primary shrink-0 !px-4" aria-label="Envoyer">
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
