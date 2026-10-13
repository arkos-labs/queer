import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { WEB_ORIGIN } from '@/lib/appLinks';

/**
 * Lien vers une page légale (CGU, confidentialité…).
 * Dans l'app iPhone, un simple <a> ne fait rien : on ouvre la page dans le navigateur intégré,
 * ce qui garde le formulaire d'inscription intact derrière. Sur le web, c'est un lien normal.
 */
export function LegalLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!Capacitor.isNativePlatform()) return;
    e.preventDefault();
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: `${WEB_ORIGIN}${to}` });
  };
  return (
    <a href={to} onClick={onClick} className={className} target={Capacitor.isNativePlatform() ? undefined : '_blank'} rel="noopener noreferrer">
      {children}
    </a>
  );
}
