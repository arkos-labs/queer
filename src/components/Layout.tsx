import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Heart, Compass, User as UserIcon, Settings, Shield, MessageCircle, LifeBuoy } from 'lucide-react';
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
  const { user, profile } = useAuth();
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
        <div className="sticky top-0 z-50 flex flex-col bg-[#1c1e2b] text-white pt-4 px-4 shadow-md w-full">
          <div className="flex items-center justify-between pb-4">
            <button
              onClick={() => go('/ressources')}
              className="flex items-center space-x-1 bg-white/10 px-3 py-1.5 rounded-full text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
            >
              <LifeBuoy size={16} />
              <span className="">Aide</span>
            </button>

            <button onClick={() => go(user ? '/annuaire' : '/')} className="flex flex-col items-center cursor-pointer">
              <img
                src="/logo.png"
                alt="Queer Services"
                className="h-16 w-16 object-contain"
                style={{ filter: 'brightness(1.2)' }}
              />
            </button>

            {user && profile ? (
              <button
                onClick={() => go('/profil')}
                className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold border-2 border-white/30 overflow-hidden relative shadow-sm"
              >
                {profile.photo_url ? (
                  <img src={profile.photo_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  profile.display_name.substring(0, 2).toUpperCase()
                )}
              </button>
            ) : !isLanding ? (
              <button onClick={() => go('/connexion')} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 transition-colors">
                Co.
              </button>
            ) : (
              <div className="w-9" />
            )}
          </div>

          {/* Search bar is rendered in Layout ONLY on the directory page to be sticky at the very top */}
          {path === '/annuaire' && (
            <div className="relative pb-2">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none pb-2">
                <Compass size={20} className="text-slate-400" />
              </div>
              <input
                type="search"
                onChange={(e) => window.dispatchEvent(new CustomEvent('directory-search', { detail: e.target.value }))}
                placeholder="Montage cuisine, ménage, pet-sitting..."
                className="block w-full pl-12 pr-4 py-3 bg-white text-slate-900 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 shadow-lg text-sm outline-none"
              />
            </div>
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

      </div>
    </div>
  );
}
