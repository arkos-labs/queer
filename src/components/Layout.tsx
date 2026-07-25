import { type ReactNode } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Heart, Compass, User as UserIcon, Settings, Shield } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 group">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-soft transition group-active:scale-95">
        <Heart size={16} fill="currentColor" />
      </div>
      <span className="font-display text-base font-semibold tracking-tight text-neutral-900">
        Queer<span className="text-primary-600">Service</span>
      </span>
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { user, profile, signOut } = useAuth();

  const go = (to: string) => navigate(to);

  const tabs = [
    { label: 'Annuaire', to: '/annuaire', icon: Compass, show: !!user },
    { label: 'Profil', to: '/profil', icon: UserIcon, show: !!user },
    { label: 'Admin', to: '/admin', icon: Shield, show: !!profile?.is_admin },
    { label: 'Réglages', to: '/parametres', icon: Settings, show: !!user },
  ].filter((t) => t.show);

  const isLanding = path === '/' || path === '/connexion' || path === '/inscription';

  return (
    <div className="mobile-shell">
      <div className="mobile-frame">
        {/* Status-bar style top accent */}
        <div className="mobile-status-bar">
          <Logo onClick={() => go(user ? '/annuaire' : '/')} />
          {user && profile && (
            <button
              onClick={() => go('/profil')}
              className="flex items-center gap-2 rounded-full bg-neutral-100 py-0.5 pl-0.5 pr-2.5 transition active:scale-95"
            >
              <Avatar name={profile.display_name} src={profile.photo_url} size={26} />
            </button>
          )}
          {!user && !isLanding && (
            <button onClick={() => go('/connexion')} className="btn-ghost btn-sm">
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
                    'mobile-tab',
                    active ? 'mobile-tab-active' : 'mobile-tab-inactive',
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  <span>{t.label}</span>
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
