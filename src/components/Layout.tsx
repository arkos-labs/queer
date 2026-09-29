import { BrandHeader } from '@/components/BrandHeader';
import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Compass, User as UserIcon, Settings, Shield, MessageCircle, Calendar, Bell } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { MissionsWidget } from '@/components/MissionsWidget';
import { CommunityConfirmationModal } from '@/components/CommunityConfirmationModal';

export function Layout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { user, profile, setProfile } = useAuth();
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

  const isLanding = path === '/' || path === '/connexion' || path === '/inscription' || path === '/mot-de-passe-oublie';
  const isFixedAuthScreen = path === '/connexion' || path === '/mot-de-passe-oublie';
  const isOnboarding = path === '/onboarding';
  const isMessageThread = path.startsWith('/messages/');

  return (
    <div className={isFixedAuthScreen ? 'fixed inset-0 flex overflow-hidden overscroll-none' : 'mobile-shell'}>
      <div className={isFixedAuthScreen ? 'flex h-full min-h-0 w-full flex-col overflow-hidden' : 'mobile-frame'}>
        {/* Fixed 80px header below the iPhone safe area. */}
        {!isMessageThread && (path === '/' || (!isLanding && !isOnboarding)) && (
          <BrandHeader fixed scrolled={scrolled} onLogo={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        )}

        {/* Floating Bell (for app pages) */}
        {!isMessageThread && !isLanding && !isOnboarding && (
          <div className={cn(
               "fixed top-0 inset-x-0 z-[60] flex flex-col justify-center px-4 w-full pointer-events-none",
             )} style={{
               paddingTop: 'env(safe-area-inset-top, 0px)',
               height: 'calc(88px + env(safe-area-inset-top, 0px))',
             }}>
          <div className="flex items-center justify-end gap-2">
            {user && profile && <MissionsWidget />}
            {user && profile ? (
              <div className="relative pointer-events-auto">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-sm transition-colors hover:bg-primary-50"
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
        <main
          className={isFixedAuthScreen ? 'min-h-0 flex-1 overflow-hidden overscroll-none' : 'mobile-content'}
          style={{
            paddingTop: isMessageThread ? 0 : (isLanding || isOnboarding) ? 'env(safe-area-inset-top, 0px)' : 'calc(112px + env(safe-area-inset-top, 0px))',
            paddingBottom: (isLanding || isOnboarding || isMessageThread) ? 0 : undefined,
          }}
        >
          {user && profile && profile.is_community_member === null && path !== '/onboarding' && !isLanding && (
            <CommunityConfirmationModal 
              profile={profile} 
              onComplete={(isMember) => setProfile({ ...profile, is_community_member: isMember })} 
            />
          )}
          {children}
        </main>

        {/* Bottom tab bar */}
        {user && profile && !isOnboarding && !isMessageThread && tabs.length > 0 && (
          <nav className="mobile-tabbar" aria-label="Navigation principale">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = path.startsWith(t.to) || (t.to === '/annuaire' && path === '/');
              return (
                <button
                  key={t.to}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => go(t.to)}
                  className={cn(
                    'mobile-tab relative',
                    active ? 'mobile-tab-active' : 'mobile-tab-inactive',
                  )}
                >
                  <span className="tab-icon-wrap">
                    <Icon size={23} strokeWidth={active ? 2.3 : 1.8} />
                    {t.badge > 0 && (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-500 text-white px-1 text-[9px] font-bold leading-none"
                      >
                        {t.badge > 9 ? '9+' : t.badge}
                      </span>
                    )}
                  </span>
                  <span className="mobile-tab-label">
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
