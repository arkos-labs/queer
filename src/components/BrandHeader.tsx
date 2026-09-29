import logoUrl from '@/assets/logo.png';
import { ArrowLeft } from 'lucide-react';

export function BrandHeader({ fixed = false, safeArea = true, scrolled = false, onBack, onLogo }: {
  fixed?: boolean;
  safeArea?: boolean;
  scrolled?: boolean;
  onBack?: () => void;
  onLogo?: () => void;
}) {
  return (
    <div className={`${fixed ? 'fixed top-0 inset-x-0 z-50' : 'relative w-full shrink-0'} isolate flex items-center justify-center px-4`}
      style={{ paddingTop: safeArea ? 'env(safe-area-inset-top, 0px)' : 0, height: safeArea ? 'calc(88px + env(safe-area-inset-top, 0px))' : 88 }}>
      <div className="pointer-events-none absolute inset-0 -z-10 transition-opacity" style={{ opacity: scrolled ? 1 : 0, background: 'linear-gradient(to bottom, rgba(237,233,254,0.97) 0%, rgba(237,233,254,0.82) 58%, rgba(237,233,254,0) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} />
      {onBack && <button onClick={onBack} aria-label="Retour" className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-ink-base"><ArrowLeft size={22} /></button>}
      {onLogo ? <button onClick={onLogo} aria-label="Retour en haut" className="flex h-[76px] w-[104px] items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500"><img src={logoUrl} alt="Queer Services" className="h-full w-full object-contain" /></button>
        : <img src={logoUrl} alt="Queer Services" className="h-[76px] w-[104px] object-contain" />}
    </div>
  );
}
