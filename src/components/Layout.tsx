import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Compass, User as UserIcon, Settings, Shield, MessageCircle, Calendar, Bell } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { MissionsWidget } from '@/components/MissionsWidget';

export function Layout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { user, profile } = useAuth();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const unreadNotifsCount = notifications.filter(n => !n.read_at).length;

  const go = (to: string) => navigate(to);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: conns } = await supabase
          .from('connections')
          .select('id')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
        const ids = (conns ?? []).map((c: { id: string }) => c.id);
        if (!ids.length) {
          if (!cancelled) setUnread(0);
          return;
        }
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('connection_id', ids)
          .neq('sender_id', user.id)
          .is('read_at', null);
        if (!cancelled) setUnread(count ?? 0);

        // Fetch notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!cancelled) setNotifications((notifs ?? []) as Notification[]);
      } catch {
        if (!cancelled) {
          setUnread(0);
          setNotifications([]);
        }
      }
    })();
    
    const channel = supabase
      .channel('layout-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // Re-check whenever the route changes (e.g. after reading a thread).
  }, [user, path]);

  const markNotifRead = async (n: Notification) => {
    if (!n.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
      setNotifications((prev) => prev.map((notif) => notif.id === n.id ? { ...notif, read_at: new Date().toISOString() } : notif));
    }
    if (n.action_url) {
      setShowNotifications(false);
      go(n.action_url);
    }
  };

  const tabs = [
    { label: 'Accueil', to: '/annuaire', icon: Compass, show: !!user, badge: 0 },
    { label: 'Événements', to: '/evenements', icon: Calendar, show: !!user, badge: 0 },
    { label: 'Messages', to: '/messages', icon: MessageCircle, show: !!user, badge: unread },
    { label: 'Profil', to: '/profil', icon: UserIcon, show: !!user, badge: 0 },
    { label: 'Admin', to: '/admin', icon: Shield, show: !!profile?.is_admin, badge: 0 },
    { label: 'Réglages', to: '/parametres', icon: Settings, show: !!user, badge: 0 },
  ].filter((t) => t.show);

  const isLanding = path === '/' || path === '/connexion' || path === '/inscription';

  return (
    <div className="mobile-shell">
      <div className="mobile-frame">
        {/* Big floating logo: seamless dissolve, no header line, no box, logo always crisp and visible */}
        {(path === '/' || !isLanding) && (
          <div
            className={cn(
              "fixed top-0 inset-x-0 z-50 flex items-center justify-center transition-all duration-300 pointer-events-none",
              scrolled
                ? "pt-0.5 sm:pt-1 pb-12 sm:pb-16"
                : "pt-1 sm:pt-1.5 pb-2"
            )}
            style={{ isolation: 'isolate' }}
          >
            {/* Seamless dissolved frosted background only when scrolled — starts fading strictly below the logo */}
            <div
              className={cn(
                "absolute inset-0 pointer-events-none transition-opacity duration-300 z-0",
                scrolled ? "opacity-100" : "opacity-0"
              )}
              style={{
                background: 'linear-gradient(to bottom, #ede9fe 0%, #ede9fe 72%, rgba(237, 233, 254, 0) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
              }}
            />

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Retour en haut"
              className="relative z-20 pointer-events-auto flex items-center justify-center group focus:outline-none transition-transform active:scale-95 -mt-[1.5mm]"
            >
              <img
                src="/logo.png"
                alt="Queer Service"
                className="h-20 sm:h-24 md:h-28 object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-md"
              />
            </button>
          </div>
        )}

        {/* Floating Bell (for app pages) */}
        {!isLanding && (
          <div className={cn(
               "fixed top-0 inset-x-0 z-[60] flex flex-col px-4 w-full transition-all duration-300 pointer-events-none",
               scrolled ? "pt-7 sm:pt-9 pb-2" : "pt-10 sm:pt-12 pb-3"
             )}>
          <div className={cn("flex items-center pb-1", user && profile ? "justify-between" : "justify-end")}>
            {user && profile && <MissionsWidget />}
            {user && profile ? (
              <div className="relative pointer-events-auto">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-900 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 shadow-sm relative"
                >
                  <Bell size={22} className="text-primary-500" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-secondary-700 animate-pulse" />
                  )}
                </button>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white/95 backdrop-blur-xl z-50 overflow-hidden animate-slide-up origin-top-right"
                      style={{ boxShadow: '0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(139,92,246,0.08)' }}>
                      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-900 tracking-widest uppercase">Notifications</h3>
                        {unreadNotifsCount > 0 && (
                          <span className="text-[11px] font-medium text-text-muted">{unreadNotifsCount} non lue{unreadNotifsCount > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-text-muted">Aucune notification.</div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => markNotifRead(n)}
                              className={cn(
                                "w-full text-left px-4 py-3 border-b border-neutral-200 flex gap-3 transition-colors",
                                !n.read_at ? "bg-amber-400/5 hover:bg-amber-400/10" : "hover:bg-neutral-100"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm text-neutral-900", !n.read_at && "font-semibold")}>{n.title}</p>
                                <p className={cn("text-[13px] truncate mt-0.5", !n.read_at ? "text-text-neutral-800" : "text-text-muted")}>{n.body}</p>
                                <p className="text-[10px] font-medium text-text-faint mt-1.5">{timeAgo(n.created_at)}</p>
                              </div>
                              {!n.read_at && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : !isLanding ? (
              <button onClick={() => go('/connexion')} className="px-3 py-1.5 rounded-sm text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 transition-colors uppercase tracking-wider">
                Connexion
              </button>
            ) : (
              <div className="w-[42px]" />
            )}
          </div>
        </div>
        )}

        {/* Scrollable app content */}
        <main className={cn("mobile-content", isLanding ? "pt-0" : "pt-[110px]")}>{children}</main>

        {/* Bottom tab bar */}
        {user && profile && tabs.length > 0 && (
          <nav className="mobile-tabbar">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = path.startsWith(t.to);
              return (
                <button
                  key={t.to}
                  onClick={() => go(t.to)}
                  className={cn(
                    'mobile-tab relative',
                    active ? 'mobile-tab-active' : 'mobile-tab-inactive',
                  )}
                >
                  <span className={cn(
                    'relative inline-flex items-center justify-center transition-all duration-200',
                    active
                      ? 'bg-primary-100 rounded-xl px-3.5 py-1.5 -mt-0.5'
                      : 'px-3.5 py-1.5 -mt-0.5'
                  )}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                    {t.badge > 0 && (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-500 text-white px-1 text-[9px] font-bold leading-none"
                      >
                        {t.badge > 9 ? '9+' : t.badge}
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    'text-[9px] font-bold mt-0.5 tracking-wider uppercase transition-all',
                    active ? 'text-primary-600 opacity-100' : 'opacity-70'
                  )}>
                    {t.label}
                    {t.badge > 0 && <span className="sr-only"> ({t.badge} non lus)</span>}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

      </div>
    </div>
  );
}
