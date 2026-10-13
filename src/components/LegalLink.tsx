import type { ReactNode } from 'react';
import { useRouter } from '@/lib/router';

/**
 * Lien vers une page légale (CGU, confidentialité…) : ouvre la page dans l'app même
 * (comme les liens des Réglages). Un simple <a> ne fait rien dans l'app iPhone.
 * Le bouton retour du header ramène à l'écran précédent.
 */
export function LegalLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
