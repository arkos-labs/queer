import { useEffect, useState } from 'react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Connection, Message, PublicProfile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import { censorInsults } from '@/lib/profanity';
import { maskContactInfo } from '@/lib/contactMask';
import { MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { SCREENSHOT_DEMO_PROFILES } from '@/lib/screenshotDemo';

interface ConversationRow {
  connection: Connection;
  other: PublicProfile | undefined;
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

        const allConnections = (connRes.data ?? []) as Connection[];
        const { data: blockRows } = await supabase.from('blocked_users').select('blocker_id, blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        const blockedIds = new Set((blockRows ?? []).map((block) => block.blocker_id === user.id ? block.blocked_id : block.blocker_id));
        const connections = allConnections.filter((connection) => !blockedIds.has(connection.user_a === user.id ? connection.user_b : connection.user_a));
        const otherIds = Array.from(
          new Set(connections.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))),
        );
        const connIds = connections.map((c) => c.id);

        const [othersRes, msgsRes] = await Promise.all([
          otherIds.length ? supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).in('id', otherIds) : Promise.resolve({ data: [], error: null }),
          connIds.length
            ? supabase.from('messages').select('*').in('connection_id', connIds).order('created_at', { ascending: true })
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (cancelled) return;

        const otherMap = new Map<string, PublicProfile>();
        for (const o of (othersRes.data ?? []) as PublicProfile[]) otherMap.set(o.id, o);

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

        const hugo = SCREENSHOT_DEMO_PROFILES.find((profile) => profile.id === 'demo-eden');
        const demoConversation: ConversationRow = {
          connection: { id: 'demo-connection-hugo', user_a: user.id, user_b: 'demo-eden', service_label: 'Aide pour un déménagement', status: 'accepted', mission_request_id: null, is_paid: false, created_at: '2026-09-28T15:00:00Z', updated_at: '2026-09-28T16:20:00Z' },
          other: hugo,
          lastMessage: { id: 'demo-message-hugo-last', connection_id: 'demo-connection-hugo', sender_id: 'demo-eden', body: 'Parfait, à samedi !', created_at: '2026-09-28T16:20:00Z', read_at: null },
          unreadCount: 1,
        };
        setRows([demoConversation, ...built]);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Impossible de charger vos messages.');
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // A bit heavy to reload entirely, but ensures we always get the new
          // connections/profiles that we might not have yet in state if someone
          // we never talked to messages us.
          load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-full bg-paper-base animate-fade-in pb-20">
      <div className="border-b border-gold-hairline bg-white/60 backdrop-blur-md sticky top-0 z-20">
        <div className="container-app py-6">
          <h1 className="font-display text-3xl font-semibold text-ink-base">Messages</h1>
          <p className="mt-2 text-ink-muted">Vos conversations avec la communauté.</p>
          <div aria-hidden className="mt-3 h-1 w-16 rounded-full" style={{ background: 'linear-gradient(90deg, #FF0018 0%, #FFA52C 20%, #FFFF41 40%, #008018 60%, #0000F9 80%, #86007D 100%)' }} />
        </div>
      </div>

      <div className="container-app max-w-2xl py-6">
        {error && <div className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-3xl border border-gold-hairline bg-white/60 animate-pulse shadow-soft" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-10 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm">
              <MessageCircle size={26} className="text-patina-deep" />
            </div>
            <h3 className="text-lg font-semibold text-ink-base">Aucune conversation</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Contactez un membre depuis l'annuaire pour démarrer un échange.
            </p>
            <button onClick={() => navigate('/annuaire')} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white border border-gold-hairline px-6 py-2.5 font-semibold text-ink-base shadow-sm transition-transform hover:-translate-y-0.5 mx-auto">
              Explorer l'annuaire <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              (() => {
                const isSupport = r.connection.service_label === 'Support Queer Service';
                const name = isSupport ? 'Admin' : (r.other?.display_name ?? 'Membre');
                return (
              <button
                key={r.connection.id}
                onClick={() => navigate(`/messages/${r.connection.id}`)}
                className="flex w-full items-center gap-4 rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift hover:bg-white/80 shadow-soft"
              >
                {isSupport ? <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><ShieldCheck size={23} /></span> : <Avatar name={r.other?.display_name ?? 'Membre'} src={r.other?.photo_url} size={48} className="bg-paper-raised text-ink-muted border border-gold-hairline" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="break-words font-bold leading-tight text-ink-base">{name}</p>
                    {r.lastMessage && (
                      <span className="shrink-0 text-xs font-medium text-patina-deep">{timeAgo(r.lastMessage.created_at)}</span>
                    )}
                  </div>
                  <p className={`mt-0.5 truncate text-sm ${r.unreadCount > 0 ? 'font-bold text-ink-base' : 'text-ink-muted'}`}>
                    {r.lastMessage
                      ? `${r.lastMessage.sender_id === user.id ? 'Vous : ' : ''}${r.connection.status === 'pending' && !isSupport ? maskContactInfo(censorInsults(r.lastMessage.body)) : censorInsults(r.lastMessage.body)}`
                      : isSupport ? 'Équipe Queer Services' : (r.connection.service_label ?? 'Nouvelle mise en relation')}
                  </p>
                </div>
                {r.unreadCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-patina-deep px-1.5 text-[11px] font-bold text-white shadow-sm">
                    {r.unreadCount}
                  </span>
                )}
              </button>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
