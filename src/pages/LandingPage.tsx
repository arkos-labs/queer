import { LegalLink } from '@/components/LegalLink';
import { useState } from 'react';
import { useRouter } from '@/lib/router';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/appleSignIn';
import { signInWithGoogle } from '@/lib/googleSignIn';
import {
  ShieldCheck,
  BadgeCheck,
  Heart,
  Search,
  UserPlus,
  ArrowRight,
  Wrench,
  SprayCan,
  PawPrint,
  Leaf,
  Monitor,
  Truck,
  Baby,
} from 'lucide-react';

function CategoryTile({
  label,
  image,
  icon: Icon,
  color,
  bg,
  scale = 1,
  to,
  onNavigate,
}: {
  label: string;
  image?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  scale?: number;
  to: string;
  onNavigate: (to: string) => void;
}) {
  const [currentSrc, setCurrentSrc] = useState(image);
  const [hasFailed, setHasFailed] = useState(false);

  const handleError = () => {
    if (currentSrc && !currentSrc.endsWith('.png.png')) {
      setCurrentSrc(`${currentSrc}.png`);
    } else {
      setHasFailed(true);
    }
  };

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(to);
      }}
      className="group flex w-[68px] shrink-0 flex-col items-center gap-2 py-1 text-center transition-all duration-200"
      onMouseEnter={e => {
        (e.currentTarget.querySelector('[data-circle]') as HTMLElement).style.transform = 'translateY(-4px) scale(1.03)';
        (e.currentTarget.querySelector('[data-circle]') as HTMLElement).style.boxShadow = `0 8px 32px -8px rgba(0,0,0,0.14), 0 16px 48px -12px ${color}40`;
      }}
      onMouseLeave={e => {
        (e.currentTarget.querySelector('[data-circle]') as HTMLElement).style.transform = '';
        (e.currentTarget.querySelector('[data-circle]') as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
      }}
    >
      <div
        data-circle
        className="flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft transition-all duration-200"
        style={{
          background: bg,
        }}
      >
        {currentSrc && !hasFailed ? (
          <img
            src={currentSrc}
            alt={label}
            className="w-full h-full object-contain"
            style={{ transform: `scale(${scale * 0.72})`, mixBlendMode: 'multiply' }}
            onError={handleError}
          />
        ) : (
          <div
            className="h-1/2 w-1/2 rounded-full flex items-center justify-center"
            style={{ background: bg }}
          >
            <Icon size={20} style={{ color }} strokeWidth={1.75} />
          </div>
        )}
      </div>
      <span className="max-w-[66px] text-[10px] font-bold leading-[1.15] text-neutral-700 line-clamp-2">
        {label}
      </span>
    </a>
  );
}

export function LandingPage() {
  const { navigate } = useRouter();
  const isNativeApp = Capacitor.isNativePlatform();
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Inscription / connexion avec Google depuis l'accueil (site et app).
  const onGoogle = async () => {
    setAppleError(null);
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    if (res.error) {
      setGoogleLoading(false);
      setAppleError(res.error);
      return;
    }
    if (res.cancelled) {
      setGoogleLoading(false);
      return;
    }
    if (Capacitor.isNativePlatform()) {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      let hasProfile = false;
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle();
        hasProfile = !!prof?.display_name;
      }
      setGoogleLoading(false);
      navigate(hasProfile ? '/annuaire' : '/onboarding');
    }
  };

  // Inscription / connexion avec Apple depuis l'accueil (app iPhone). Un nouveau compte passe par l'onboarding.
  const onApple = async () => {
    setAppleError(null);
    setAppleLoading(true);
    const res = await signInWithApple();
    if (res.error) {
      setAppleLoading(false);
      setAppleError(res.error);
      return;
    }
    if (res.cancelled) {
      setAppleLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    let hasProfile = false;
    if (uid) {
      const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle();
      hasProfile = !!prof?.display_name;
    }
    setAppleLoading(false);
    navigate(hasProfile ? '/annuaire' : '/onboarding');
  };

  return (
    <div className="min-h-screen font-sans text-neutral-900 flex flex-col relative overflow-hidden"
         style={{ background: '#ede9fe' }}>

      {/* Fond ambient — blurs existants */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -left-60 h-[500px] w-[500px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(236,72,153,0.10) 0%, transparent 70%)' }} />
        <div className="absolute top-1/4 -right-60 h-[500px] w-[500px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
      </div>

      <main className="relative z-10 flex-1 w-full">

        {/* ── HERO ── */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-32 lg:pt-36 pb-16 sm:pb-20
                        grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-center">

          {/* Gauche — headline */}
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-3 mb-7">
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-primary-600">
                Annuaire d'entraide communautaire
              </span>
            </div>

            {/* Titre */}
            <h1 className="font-display font-extrabold text-neutral-900 mb-6"
                style={{ fontSize: 'clamp(2.75rem, 6.5vw, 4.5rem)', lineHeight: 1.0, letterSpacing: '-0.035em' }}>
              Fait pour nous,<br />
              <span
                className="bg-rainbow animate-gradient-x bg-clip-text text-transparent inline-block"
                style={{
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                par nous.
              </span>
            </h1>

            <p className="text-neutral-500 leading-relaxed max-w-md"
               style={{ fontSize: '1.0625rem' }}>
              Trouvez ou proposez des services en toute confiance au sein de votre communauté queer — modéré, sécurisé, construit ensemble.
            </p>

            {/* Services compacts — keep the established category illustrations. */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">Catégories fréquentes</p>
                <button onClick={() => navigate('/annuaire')} className="text-[12px] font-bold text-primary-600">Voir tout</button>
              </div>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {[
                  { label: 'Bricolage & travaux', image: '/categories/bricolage.png', icon: Wrench, color: '#d97706', bg: '#fffbeb', scale: 1.45, category: 'maison-depannage' },
                  { label: 'Ménage & aide', image: '/categories/menage.png', icon: SprayCan, color: '#0891b2', bg: '#ecfeff', scale: 1.45, category: 'maison-depannage' },
                  { label: "Garde d’animaux", image: '/categories/animaux.png', icon: PawPrint, color: '#ea580c', bg: '#fff7ed', scale: 1.45, category: 'services-entre-particuliers' },
                  { label: 'Jardinage', image: '/categories/jardinage.png', icon: Leaf, color: '#16a34a', bg: '#f0fdf4', scale: 1.45, category: 'maison-depannage' },
                  { label: 'Tech & informatique', image: '/categories/tech.png', icon: Monitor, color: '#2563eb', bg: '#eff6ff', scale: 1.45, category: 'maison-depannage' },
                  { label: 'Transport & déménagement', image: '/categories/transport.png', icon: Truck, color: '#7c3aed', bg: '#f5f3ff', scale: 1.45, category: 'maison-depannage' },
                  { label: "Garde d’enfants", image: '/categories/enfants.png', icon: Baby, color: '#db2777', bg: '#fdf2f8', scale: 1.45, category: 'services-entre-particuliers' },
                  { label: 'Santé & bien-être', image: '/categories/sante.png', icon: Heart, color: '#e11d48', bg: '#fff1f2', scale: 2.1, category: 'sante-bien-etre' },
                ].map(({ label, image, icon, color, bg, scale, category }) => (
                  <CategoryTile
                    key={label}
                    label={label}
                    image={image}
                    icon={icon}
                    color={color}
                    bg={bg}
                    scale={scale}
                    to={`/annuaire/${category}`}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Droite — CTA Card */}
          <div className="w-full max-w-[360px] mx-auto lg:mx-0">
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '28px',
              border: '1px solid rgba(124,58,237,0.13)',
              boxShadow: '0 8px 40px -8px rgba(124,58,237,0.2), 0 20px 60px -16px rgba(124,58,237,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)',
              padding: '10px',
            }}>
              <div className="px-3 pt-4 pb-4 text-center">
                <p className="text-[13px] text-neutral-500 mb-5 leading-relaxed">
                  Parcourez l'annuaire librement. Un compte gratuit n'est nécessaire que pour proposer vos services ou contacter des membres.
                </p>

                <button
                  onClick={() => navigate('/inscription')}
                  className="w-full flex items-center justify-center gap-2.5 font-extrabold text-[15px] text-white py-4 rounded-2xl active:scale-[0.98] transition-all duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                    boxShadow: '0 8px 24px -6px rgba(124,58,237,0.48)',
                  }}
                >
                  <UserPlus size={19} strokeWidth={2.2} />
                  Créer mon compte
                </button>

                <button
                  type="button"
                  onClick={onGoogle}
                  disabled={googleLoading}
                  className="mt-3 w-full flex items-center justify-center gap-2.5 font-bold text-[15px] text-neutral-800 py-4 rounded-2xl bg-white active:scale-[0.98] transition-all duration-150 disabled:opacity-45"
                  style={{ border: '1px solid rgba(0,0,0,0.18)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                  {googleLoading ? 'Connexion…' : 'Continuer avec Google'}
                </button>

                {appleError && <p className="mt-2 text-[12px] text-red-600">{appleError}</p>}
                {isAppleSignInAvailable() && (
                  <>
                    <button
                      type="button"
                      onClick={onApple}
                      disabled={appleLoading}
                      className="mt-3 w-full flex items-center justify-center gap-2.5 font-bold text-[15px] text-white py-4 rounded-2xl bg-black active:scale-[0.98] transition-all duration-150 disabled:opacity-45"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.85-2.1 1.5-3.16 1.42-.13-1.1.42-2.25 1.15-3 .82-.86 2.2-1.5 3.21-1.42zM20.5 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.38 3.52-4.1 3.54-1.53.02-1.93-1-4.01-.99-2.08.01-2.52 1.01-4.05.99-1.72-.02-3.04-1.78-4.03-3.35C-.01 15.9-.3 11 1.6 8.2c1.35-1.99 3.48-3.15 5.48-3.15 2.04 0 3.32 1.12 5 1.12 1.63 0 2.63-1.12 4.99-1.12 1.78 0 3.67.97 5.01 2.65-4.4 2.41-3.69 8.7-1.58 9.4z" />
                      </svg>
                      {appleLoading ? 'Connexion…' : 'S’inscrire avec Apple'}
                    </button>
                    <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                      En continuant avec Apple, vous acceptez les{' '}
                      <LegalLink to="/cgu" className="font-semibold text-violet-700 underline">CGU</LegalLink> et la{' '}
                      <LegalLink to="/confidentialite" className="font-semibold text-violet-700 underline">politique de confidentialité</LegalLink>.
                    </p>
                  </>
                )}

                <button
                  onClick={() => navigate('/connexion')}
                  className="mt-3 w-full flex items-center justify-center gap-2 font-bold text-[14px] py-3.5 rounded-2xl active:scale-[0.98] transition-all duration-150"
                  style={{
                    color: '#6d28d9',
                    background: '#f5f3ff',
                    border: '1px solid rgba(124,58,237,0.16)',
                  }}
                >
                  J’ai déjà un compte
                  <ArrowRight size={17} strokeWidth={2.2} />
                </button>

                <button
                  onClick={() => navigate('/annuaire')}
                  className="mt-3 w-full flex items-center justify-center gap-2 font-bold text-[14px] py-3.5 rounded-2xl active:scale-[0.98] transition-all duration-150"
                  style={{
                    color: '#374151',
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.12)',
                  }}
                >
                  <Search size={16} strokeWidth={2.2} />
                  Parcourir l'annuaire sans compte
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── TRUST BADGES ── */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', title: 'Modération active', desc: 'Une charte stricte et une équipe dédiée pour un espace sécurisant et bienveillant.' },
              { icon: BadgeCheck,  color: '#059669', bg: 'rgba(5,150,105,0.08)',   title: 'Membres vérifiés', desc: 'Des badges de confiance attribués pour rassurer et guider vos échanges.' },
              { icon: Heart,       color: '#db2777', bg: 'rgba(219,39,119,0.08)',  title: 'Fait avec amour',  desc: 'Pensé pour et par la communauté queer, avec l\'inclusivité au cœur de chaque décision.' },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title}
                   className="p-6 rounded-2xl bg-white transition-all duration-200 cursor-default"
                   style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px -4px rgba(124,58,237,0.07)' }}
                   onMouseEnter={e => {
                     (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                     (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px -4px rgba(0,0,0,0.08), 0 12px 40px -8px rgba(124,58,237,0.14)';
                     (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.14)';
                   }}
                   onMouseLeave={e => {
                     (e.currentTarget as HTMLElement).style.transform = '';
                     (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px -4px rgba(124,58,237,0.07)';
                     (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)';
                   }}>
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center mb-4"
                     style={{ background: bg }}>
                  <Icon size={22} style={{ color }} strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-extrabold text-neutral-900 mb-2" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMMENT ÇA MARCHE ── */}
        <div className={`max-w-6xl mx-auto px-5 sm:px-8 ${isNativeApp ? 'pb-28' : 'pb-24'}`}>
          <div className="mb-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5"
                 style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(124,58,237,0.12)' }}>
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-primary-600">En 3 étapes</span>
            </div>
            <h2 className="font-extrabold text-neutral-900"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Comment ça marche ?
            </h2>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-3xl bg-white p-7 shadow-soft sm:p-14"
               style={{ border: '1px solid rgba(124,58,237,0.1)' }}>
            {/* Glows */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08), transparent 70%)' }} />
            <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse, rgba(219,39,119,0.07), transparent 70%)' }} />

            <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
              {[
                { n: '1', title: 'Créez votre profil',     desc: 'Inscrivez-vous gratuitement. Remplissez votre bio et précisez si vous offrez ou cherchez des services.' },
                { n: '2', title: 'Déclarez vos talents',   desc: 'Ajoutez vos compétences ou vos besoins. Notre moteur connecte les bons profils ensemble.' },
                { n: '3', title: 'Échangez en sécurité',   desc: 'Utilisez la messagerie intégrée. Après la prestation, laissez un avis pour faire grandir la confiance.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-4 text-left md:flex-col md:items-center md:text-center">
                  <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-[18px] font-extrabold text-white shadow-soft md:mb-1"
                     style={{
                         boxShadow: '0 2px 12px -2px rgba(124,58,237,0.2)',
                         letterSpacing: '-0.03em',
                       }}>
                    {n}
                  </div>
                  <div><div className="mb-1 flex flex-wrap items-center gap-2 md:justify-center"><h3 className="text-[17px] font-extrabold text-neutral-900" style={{ letterSpacing: '-0.02em' }}>{title}</h3><span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">{n === '1' ? 'Gratuit' : n === '2' ? 'Filtres' : 'Sécurisé'}</span></div><p className="text-[14px] leading-relaxed text-neutral-500">{desc}</p></div>
                </div>
              ))}
            </div>

            <div className="relative z-10 flex justify-center mt-10">
              <button
                onClick={() => navigate('/inscription')}
                className="inline-flex items-center gap-2.5 font-extrabold text-[15px] text-white px-8 py-4 rounded-[18px] transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                  boxShadow: '0 8px 32px -4px rgba(124,58,237,0.45)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 48px -6px rgba(124,58,237,.6)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px -4px rgba(124,58,237,0.45)';
                }}
              >
                <UserPlus size={18} strokeWidth={2.2} />
                Rejoindre la communauté
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* The website keeps its footer; native apps expose these links in Settings. */}
      {!isNativeApp && <footer className="relative z-10 px-5 sm:px-8 py-8 pb-36 sm:pb-10"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400">
            © {new Date().getFullYear()} Queer Service
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: 'Ressources', to: '/ressources' },
              { label: 'Mentions légales', to: '/mentions-legales' },
              { label: 'CGU', to: '/cgu' },
              { label: 'Confidentialité', to: '/confidentialite' },
              { label: 'Cookies', to: '/cookies' },
            ].map(({ label, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-primary-600 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </footer>}
    </div>
  );
}
