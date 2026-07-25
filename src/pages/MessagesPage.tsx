import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Connection, Message, Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import { MessageCircle, ArrowRight } from 'lucide-react';

interface ConversationRow {
  connection: Connection;
  other: Profile | undefined;
  lastMessage: Message | null;
  unreadCount: number;
}

export function MessagesPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const connRes = await supabase
          .from('connections')
          .select('*')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order('updated_at', { ascending: false });
        if (cancelled) return;
        if (connRes.error) {
          setError(connRes.error.message);
          setLoading(false);
          return;
        }

        const connections = (connRes.data ?? []) as Connection[];
        const otherIds = Array.from(
          new Set(connections.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))),
        );
        const connIds = connections.map((c) => c.id);

        const [othersRes, msgsRes] = await Promise.all([
          otherIds.length ? supabase.from('profiles').select('*').in('id', otherIds) : Promise.resolve({ data: [], error: null }),
          connIds.length
            ? supabase.from('messages').select('*').in('connection_id', connIds).order('created_at', { ascending: true })
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (cancelled) return;

        const otherMap = new Map<string, Profile>();
        for (const o of (othersRes.data ?? []) as Profile[]) otherMap.set(o.id, o);

        const msgsByConn = new Map<string, Message[]>();
        for (const m of (msgsRes.data ?? []) as Message[]) {
          if (!msgsByConn.has(m.connection_id)) msgsByConn.set(m.connection_id, []);
          msgsByConn.get(m.connection_id)!.push(m);
        }

        const built: ConversationRow[] = connections.map((c) => {
          const msgs = msgsByConn.get(c.id) ?? [];
          const lastMessage = msgs.length ? msgs[msgs.length - 1] : null;
          const unreadCount = msgs.filter((m) => m.sender_id !== user.id && !m.read_at).length;
          return {
            connection: c,
            other: otherMap.get(c.user_a === user.id ? c.user_b : c.user_a),
            lastMessage,
            unreadCount,
          };
        });

        setRows(built);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Impossible de charger vos messages.');
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <h1 className="font-display text-3xl font-semibold text-neutral-900">Messages</h1>
          <p className="mt-2 text-neutral-600">Vos conversations avec la communauté.</p>
        </div>
      </div>

      <div className="container-app max-w-2xl py-6">
        {error && <div className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-20 animate-pulse bg-neutral-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
              <MessageCircle size={26} />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Aucune conversation</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Contactez un membre depuis l'annuaire pour démarrer un échange.
            </p>
            <button onClick={() => navigate('/annuaire')} className="btn-outline mt-5">
              Explorer l'annuaire <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.connection.id}
                onClick={() => navigate(`/messages/${r.connection.id}`)}
                className="card flex w-full items-center gap-3 p-4 text-left hover:shadow-md transition-shadow"
              >
                <Avatar name={r.other?.display_name ?? 'Membre'} src={r.other?.photo_url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-neutral-900">{r.other?.display_name ?? 'Membre'}</p>
                    {r.lastMessage && (
                      <span className="shrink-0 text-xs text-neutral-400">{timeAgo(r.lastMessage.created_at)}</span>
                    )}
                  </div>
                  <p className={`mt-0.5 truncate text-sm ${r.unreadCount > 0 ? 'font-semibold text-neutral-900' : 'text-neutral-500'}`}>
                    {r.lastMessage
                      ? `${r.lastMessage.sender_id === user.id ? 'Vous : ' : ''}${r.lastMessage.body}`
                      : r.connection.service_label ?? 'Nouvelle mise en relation'}
                  </p>
                </div>
                {r.unreadCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[11px] font-semibold text-white">
                    {r.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
