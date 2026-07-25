import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Heart, Compass, User as UserIcon, Settings, Shield, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Accueil Queer Service" className="flex items-center group mt-1">
      <img
        src="/logo.png"
        alt="Queer Service"
        className="h-[65px] object-contain transition-transform group-active:scale-95"
      />
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { user, profile, signOut } = useAuth();
  const [unread, setUnread] = useState(0);

  const go = (to: string) => navigate(to);

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
      } catch {
        if (!cancelled) setUnread(0);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-check whenever the route changes (e.g. after reading a thread).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, path]);

  const tabs = [
    { label: 'Annuaire', to: '/annuaire', icon: Compass, show: !!user, badge: 0 },
    { label: 'Messages', to: '/messages', icon: MessageCircle, show: !!user, badge: unread },
    { label: 'Profil', to: '/profil', icon: UserIcon, show: !!user, badge: 0 },
    { label: 'Admin', to: '/admin', icon: Shield, show: !!profile?.is_admin, badge: 0 },
    { label: 'Réglages', to: '/parametres', icon: Settings, show: !!user, badge: 0 },
  ].filter((t) => t.show);

  const isLanding = path === '/' || path === '/connexion' || path === '/inscription';

  return (
    <div className="mobile-shell">
      <div className="mobile-frame">
        {/* Status-bar style top accent */}
        <div className="mobile-status-bar relative flex items-center justify-end">
          {/* Centered Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Logo onClick={() => go(user ? '/annuaire' : '/')} />
          </div>

          {user && profile && (
            <button
              onClick={() => go('/profil')}
              aria-label="Mon profil"
              className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 py-0.5 pl-0.5 pr-2.5 transition active:scale-95 z-10 shadow-sm"
            >
              <Avatar name={profile.display_name} src={profile.photo_url} size={26} />
            </button>
          )}
          {!user && !isLanding && (
            <button onClick={() => go('/connexion')} className="z-10 px-4 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 transition-colors">
              Connexion
            </button>
          )}
        </div>

        {/* Scrollable app content */}
        <main className="mobile-content">{children}</main>

        {/* Bottom tab bar */}
        {user && tabs.length > 0 && (
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
                  <span className="relative inline-flex">
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                    {t.badge > 0 && (
                      <span
                        aria-hidden
                        className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-bold text-white"
                      >
                        {t.badge > 9 ? '9+' : t.badge}
                      </span>
                    )}
                  </span>
                  <span>
                    {t.label}
                    {t.badge > 0 && <span className="sr-only"> ({t.badge} non lus)</span>}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Hidden sign-out trigger — surfaced inside Settings page instead */}
        <span className="hidden" aria-hidden onClick={() => signOut()} />
      </div>
    </div>
  );
}
