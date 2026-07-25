import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Connection, Message, Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { formatDate, timeAgo } from '@/lib/utils';
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, Flag } from 'lucide-react';

const STATUS_META: Record<Connection['status'], { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', cls: 'bg-warning-100 text-warning-700', icon: Clock },
  accepted: { label: 'Acceptée', cls: 'bg-primary-100 text-primary-700', icon: CheckCircle2 },
  completed: { label: 'Terminée', cls: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', cls: 'bg-neutral-100 text-neutral-600', icon: XCircle },
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
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
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
        const [otherRes, msgsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', otherId).maybeSingle(),
          supabase.from('messages').select('*').eq('connection_id', id).order('created_at', { ascending: true }),
        ]);
        if (cancelled) return;
        setOther((otherRes.data ?? null) as Profile | null);
        const msgs = (msgsRes.data ?? []) as Message[];
        setMessages(msgs);
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
  }, [messages.length]);

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
    if (!connection) return;
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
  const statusMeta = STATUS_META[connection.status];

  return (
    <div className="flex flex-col animate-fade-in">
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

        {connection.status !== 'cancelled' && connection.status !== 'completed' && (
          <div className="flex gap-2 border-t border-neutral-100 px-4 py-2">
            {connection.status === 'pending' && !isInitiator && (
              <button onClick={() => updateStatus('accepted')} className="btn-outline btn-sm">
                <CheckCircle2 size={14} /> Accepter
              </button>
            )}
            {connection.status === 'accepted' && (
              <button onClick={() => updateStatus('completed')} className="btn-outline btn-sm">
                <CheckCircle2 size={14} /> Marquer terminée
              </button>
            )}
            <button onClick={() => updateStatus('cancelled')} className="btn-ghost btn-sm text-neutral-500">
              <XCircle size={14} /> Annuler
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Aucun message pour l'instant. Dites bonjour à {other?.display_name?.split(' ')[0] ?? 'ce membre'} !
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === user.id;
            const prev = messages[i - 1];
            const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            return (
              <div key={m.id}>
                {showDate && (
                  <p className="my-3 text-center text-xs font-medium text-neutral-400">{formatDate(m.created_at)}</p>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      mine
                        ? 'rounded-br-sm bg-primary-600 text-white'
                        : 'rounded-bl-sm bg-neutral-100 text-neutral-900'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-primary-100' : 'text-neutral-400'}`}>{timeAgo(m.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="mx-4 mb-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>}

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
