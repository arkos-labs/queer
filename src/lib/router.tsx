import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterContextValue {
  path: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function currentPath() {
  return window.location.pathname || '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(currentPath());

  useEffect(() => {
    const onPop = () => {
      setPath(currentPath());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

export function parseRoute(path: string): { name: string; params: Record<string, string> } {
  const clean = path.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home', params: {} };
  const [first, second] = parts;
  if (first === 'annuaire') return { name: 'directory', params: {} };
  if (first === 'missions') return { name: 'missions', params: {} };
  if (first === 'lieux' && second) return { name: 'place-detail', params: { id: second } };
  if (first === 'messages' && second) return { name: 'message-thread', params: { id: second } };
  if (first === 'messages') return { name: 'messages', params: {} };
  if (first === 'profil' && second === 'modifier') return { name: 'profile-edit', params: {} };
  if (first === 'profil' && second) return { name: 'profile', params: { id: second } };
  if (first === 'profil') return { name: 'my-profile', params: {} };
  if (first === 'connexion') return { name: 'signin', params: {} };
  if (first === 'inscription') return { name: 'signup', params: {} };
  if (first === 'onboarding') return { name: 'onboarding', params: {} };
  if (first === 'parametres') return { name: 'settings', params: {} };
  if (first === 'admin') return { name: 'admin', params: {} };
  if (first === 'ressources') return { name: 'resources', params: {} };
  if (first === 'installer') return { name: 'install-guide', params: {} };
  if (first === 'evenements') return { name: 'events', params: {} };
  if (first === 'mentions-legales') return { name: 'legal', params: { slug: 'mentions-legales' } };
  if (first === 'cgu') return { name: 'legal', params: { slug: 'cgu' } };
  if (first === 'confidentialite') return { name: 'legal', params: { slug: 'confidentialite' } };
  if (first === 'cookies') return { name: 'legal', params: { slug: 'cookies' } };
  return { name: 'home', params: {} };
}
