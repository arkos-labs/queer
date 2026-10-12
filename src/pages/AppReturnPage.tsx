import { useEffect } from 'react';
import { useRouter } from '@/lib/router';
import { APP_SCHEME } from '@/lib/appLinks';

/**
 * Page de retour après Stripe quand le paiement a été lancé depuis l'app iOS :
 * Stripe ouvre Safari sur cette page, qui rouvre aussitôt l'application.
 * Sur le web (sans l'app), elle renvoie simplement vers la bonne page.
 */
export function AppReturnPage() {
  const { path, navigate } = useRouter();
  const query = new URLSearchParams(path.split('?')[1] ?? '');
  const to = query.get('to') ?? '/messages';
  const safeTo = to.startsWith('/') && !to.startsWith('//') ? to : '/messages';
  const target = safeTo;
  const deepLink = `${APP_SCHEME}://${target.replace(/^\//, '')}`;

  useEffect(() => {
    window.location.href = deepLink;
    const fallback = window.setTimeout(() => navigate(target, { replace: true }), 2500);
    return () => window.clearTimeout(fallback);
  }, [deepLink, navigate, target]);

  return (
    <div className="container-app py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">Retour dans l’application…</h1>
      <p className="mt-2 text-neutral-500">Si l’application ne s’ouvre pas toute seule, appuyez sur le bouton.</p>
      <a href={deepLink} className="btn-primary mt-6 inline-flex">Ouvrir Queer Services</a>
      <p className="mt-4 text-xs text-neutral-400">Sans l’application, vous serez redirigé·e vers le site dans un instant.</p>
    </div>
  );
}
