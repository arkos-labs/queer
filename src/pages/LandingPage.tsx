import { useState } from 'react';
import { useRouter } from '@/lib/router';
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
  Scissors,
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
      className="group flex flex-col items-center justify-between gap-3 py-6 px-3 rounded-2xl bg-white text-center transition-all duration-200 overflow-hidden"
      style={{
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        minHeight: '220px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px -8px rgba(0,0,0,0.1), 0 16px 48px -12px rgba(124,58,237,0.14)';
        (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)';
      }}
    >
      {currentSrc && !hasFailed ? (
        <div className="w-full h-32 sm:h-40 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
          <img
            src={currentSrc}
            alt={label}
            className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-200"
            style={{ transform: `scale(${scale})` }}
            onError={handleError}
          />
        </div>
      ) : (
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 my-auto"
          style={{ background: bg }}
        >
          <Icon size={28} style={{ color }} strokeWidth={1.75} />
        </div>
      )}
      <span className="text-[12px] sm:text-[13px] font-extrabold text-neutral-800 leading-snug line-clamp-2 mt-auto">
        {label}
      </span>
    </a>
  );
}

export function LandingPage() {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

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
              Fait par nous,<br />
              <span
                className="bg-rainbow animate-gradient-x bg-clip-text text-transparent inline-block"
                style={{
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                pour nous.
              </span>
            </h1>

            <p className="text-neutral-500 leading-relaxed max-w-md"
               style={{ fontSize: '1.0625rem' }}>
              Trouvez ou proposez des services en toute confiance au sein de votre communauté queer — modéré, sécurisé, construit ensemble.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-9 flex-wrap">
              <div className="flex">
                {[
                  'linear-gradient(135deg,#f9a8d4,#c084fc)',
                  'linear-gradient(135deg,#93c5fd,#818cf8)',
                  'linear-gradient(135deg,#6ee7b7,#34d399)',
                  'linear-gradient(135deg,#fde68a,#fb923c)',
                  'linear-gradient(135deg,#c084fc,#818cf8)',
                ].map((bg, i) => (
                  <div key={i}
                       className="h-[34px] w-[34px] rounded-full border-[2.5px] border-white flex items-center justify-center text-[11px] font-bold text-white"
                       style={{ background: bg, marginLeft: i === 0 ? 0 : -9 }} />
                ))}
              </div>
              <div>
                <div className="flex gap-[2px] mb-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 font-medium">
                  <span className="font-bold text-neutral-800">+1 200 membres</span> nous font confiance
                </p>
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
              {/* Tabs */}
              <div className="flex rounded-[20px] p-[5px] gap-1 mb-5"
                   style={{ background: 'rgba(139,92,246,0.07)' }}>
                {(['signup', 'login'] as const).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className="flex-1 py-2.5 text-[13px] font-bold rounded-2xl transition-all duration-200"
                    style={activeTab === t ? {
                      background: '#fff',
                      color: '#5b21b6',
                      boxShadow: '0 2px 8px -2px rgba(91,33,182,0.18), 0 0 0 1px rgba(124,58,237,0.1)',
                    } : { color: '#9ca3af' }}
                  >
                    {i === 0 ? 'Nouveau membre' : 'Déjà inscrit·e'}
                  </button>
                ))}
              </div>

              {/* Contenu */}
              <div className="px-2.5 pb-4">
                {activeTab === 'signup' ? (
                  <div className="animate-fade-in text-center">
                    <p className="text-[13px] text-neutral-400 mb-5 leading-relaxed">
                      Rejoignez la communauté pour proposer vos services ou contacter des membres de confiance.
                    </p>
                    <button
                      onClick={() => navigate('/inscription')}
                      className="w-full flex items-center justify-center gap-2.5 font-extrabold text-[15px] text-white py-4 rounded-[18px] transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                        boxShadow: '0 8px 32px -4px rgba(124,58,237,0.45), 0 2px 8px -2px rgba(124,58,237,0.2)',
                        letterSpacing: '-0.01em',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 48px -6px rgba(124,58,237,.6), 0 4px 16px -4px rgba(124,58,237,.3)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = '';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px -4px rgba(124,58,237,0.45), 0 2px 8px -2px rgba(124,58,237,0.2)';
                      }}
                    >
                      <UserPlus size={18} strokeWidth={2.2} />
                      Créer mon compte
                    </button>
                  </div>
                ) : (
                  <div className="animate-fade-in text-center">
                    <p className="text-[13px] text-neutral-400 mb-5 leading-relaxed">
                      Bon retour parmi nous. Retrouvez vos messages et vos favoris.
                    </p>
                    <button
                      onClick={() => navigate('/connexion')}
                      className="w-full flex items-center justify-center gap-2.5 font-extrabold text-[15px] py-4 rounded-[18px] transition-all duration-200"
                      style={{
                        color: '#5b21b6',
                        border: '1.5px solid rgba(124,58,237,0.2)',
                        background: 'transparent',
                        letterSpacing: '-0.01em',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.2)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      Se connecter
                      <ArrowRight size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                )}

                <div className="mt-4 pt-4 text-center" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    onClick={() => navigate('/annuaire')}
                    className="inline-flex items-center gap-2 text-[12px] font-semibold text-neutral-400 hover:text-primary-600 transition-colors"
                  >
                    <Search size={13} strokeWidth={2.2} />
                    Explorer l'annuaire librement
                  </button>
                </div>
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

        {/* ── CATEGORIES ── */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
          {/* Section header */}
          <div className="mb-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5"
                 style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(124,58,237,0.12)' }}>
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-primary-600">Services disponibles</span>
            </div>
            <h2 className="font-extrabold text-neutral-900 mb-3"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Bien plus qu'un annuaire
            </h2>
            <p className="text-[14px] text-neutral-500 leading-relaxed max-w-md">
              Bricolage, ménage, animaux, tech — des services entre membres qui se font confiance.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: 'Bricolage & Travaux',      image: '/categories/bricolage.png', icon: Wrench,   color: '#d97706', bg: '#fffbeb', scale: 1.15, category: 'maison-depannage' },
              { label: 'Ménage & Aide',            image: '/categories/menage.png',    icon: SprayCan, color: '#0891b2', bg: '#ecfeff', scale: 1.35, category: 'maison-depannage' },
              { label: "Garde d'animaux",          image: '/categories/animaux.png',   icon: PawPrint, color: '#ea580c', bg: '#fff7ed', scale: 1.45, category: 'services-entre-particuliers' },
              { label: 'Jardinage',                image: '/categories/jardinage.png', icon: Leaf,     color: '#16a34a', bg: '#f0fdf4', scale: 1.45, category: 'maison-depannage' },
              { label: 'Tech & Informatique',      image: '/categories/tech.png',      icon: Monitor,  color: '#2563eb', bg: '#eff6ff', scale: 1.38, category: 'maison-depannage' },
              { label: 'Transport & Déménagement', image: '/categories/transport.png', icon: Truck,    color: '#7c3aed', bg: '#f5f3ff', scale: 1.1,  category: 'maison-depannage' },
              { label: "Garde d'enfants",          image: '/categories/enfants.png',   icon: Baby,     color: '#db2777', bg: '#fdf2f8', scale: 1.5,  category: 'services-entre-particuliers' },
              { label: 'Beauté & Bien-être',       image: '/categories/beaute.png',    icon: Scissors, color: '#e11d48', bg: '#fff1f2', scale: 1.15, category: 'sante-bien-etre' },
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

        {/* ── COMMENT ÇA MARCHE ── */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-24">
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

          <div className="mt-8 rounded-3xl relative overflow-hidden p-8 sm:p-14"
               style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(124,58,237,0.1)' }}>
            {/* Glows */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08), transparent 70%)' }} />
            <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse, rgba(219,39,119,0.07), transparent 70%)' }} />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { n: '1', title: 'Créez votre profil',     desc: 'Inscrivez-vous gratuitement. Remplissez votre bio et précisez si vous offrez ou cherchez des services.' },
                { n: '2', title: 'Déclarez vos talents',   desc: 'Ajoutez vos compétences ou vos besoins. Notre moteur connecte les bons profils ensemble.' },
                { n: '3', title: 'Échangez en sécurité',   desc: 'Utilisez la messagerie intégrée. Après la prestation, laissez un avis pour faire grandir la confiance.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex flex-col items-center text-center">
                  <div className="h-[50px] w-[50px] rounded-2xl bg-white flex items-center justify-center font-extrabold text-[18px] text-primary-600 mb-5"
                       style={{
                         border: '1px solid rgba(124,58,237,0.15)',
                         boxShadow: '0 2px 12px -2px rgba(124,58,237,0.2)',
                         letterSpacing: '-0.03em',
                       }}>
                    {n}
                  </div>
                  <h3 className="text-[15px] font-extrabold text-neutral-900 mb-2" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
                  <p className="text-[13px] text-neutral-500 leading-relaxed">{desc}</p>
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

      {/* ── FOOTER ── */}
      <footer className="relative z-10 px-5 sm:px-8 py-8 pb-36 sm:pb-10"
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
      </footer>
    </div>
  );
}
