import { useState } from 'react';
import { useRouter } from '@/lib/router';
import {
  ShieldCheck,
  BadgeCheck,
  Heart,
  Search,
  UserPlus,
  ArrowRight,
  LifeBuoy,
  Wrench,
  SprayCan,
  PawPrint,
  Leaf,
  Monitor,
  Truck,
  Baby,
  Scissors
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingPage() {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

  return (
    <div className="min-h-screen bg-paper-base font-sans text-ink-base flex flex-col relative overflow-hidden">
      
      {/* Subtle Pride ambient blurs in the background */}
      <div className="pointer-events-none absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-[400px] w-[400px] rounded-full bg-yellow-500/10 blur-[120px]" />

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto w-full">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          
          <h1 className="font-display font-bold tracking-tight text-ink-base mb-6 mt-4">
            <span className="block text-xl sm:text-2xl font-semibold text-ink-muted mb-3 tracking-normal">
              Annuaire LGBTQIA+ d'entraide entre membres
            </span>
            <span className="block text-5xl sm:text-7xl font-bold" style={{ color: '#6d28d9' }}>
              Fait par nous,
            </span>
            <span className="block text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-rainbow animate-gradient-x py-2">
              pour nous.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg sm:text-xl text-ink-muted mx-auto leading-relaxed font-medium">
            Trouvez ou proposez des services en toute confiance au sein de notre communauté queer.
          </p>
        </div>

        {/* Interactive CTA Card (Tabs System) */}
        <div className="w-full max-w-md mx-auto bg-paper-raised rounded-3xl p-2 sm:p-3 shadow-card ring-1 ring-gold-hairline">
          
          {/* Tabs header */}
          <div className="flex p-1 bg-paper-deep rounded-2xl mb-6">
            <button
              onClick={() => setActiveTab('signup')}
              className={cn(
                "flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
                activeTab === 'signup' 
                  ? "bg-paper-raised text-ink-base shadow-sm ring-1 ring-gold-hairline" 
                  : "text-text-light-muted hover:text-ink-base"
              )}
            >
              Nouveau membre
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={cn(
                "flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
                activeTab === 'login' 
                  ? "bg-paper-raised text-ink-base shadow-sm ring-1 ring-gold-hairline" 
                  : "text-text-light-muted hover:text-ink-base"
              )}
            >
              Déjà inscrit
            </button>
          </div>

          {/* Tab Content */}
          <div className="px-4 pb-6 sm:px-6">
            {activeTab === 'signup' ? (
              <div className="animate-fade-in text-center">
                <p className="text-sm text-text-light-muted mb-6">
                  Rejoignez la communauté pour proposer vos services ou contacter des membres de confiance.
                </p>
                <button 
                  onClick={() => navigate('/inscription')} 
                  className="w-full flex items-center justify-center gap-2 bg-patina-deep hover:bg-patina-verdigris text-white py-4 rounded-xl font-semibold text-lg transition-colors shadow-sm"
                >
                  <UserPlus size={20} />
                  S'inscrire
                </button>
              </div>
            ) : (
              <div className="animate-fade-in text-center">
                <p className="text-sm text-text-light-muted mb-6">
                  Bon retour parmi nous. Connectez-vous pour retrouver vos messages et vos favoris.
                </p>
                <button 
                  onClick={() => navigate('/connexion')} 
                  className="w-full flex items-center justify-center gap-2 bg-paper-deep hover:bg-neutral-100 text-ink-base border border-gold-hairline py-4 rounded-xl font-semibold text-lg transition-colors"
                >
                  Connexion
                  <ArrowRight size={20} />
                </button>
              </div>
            )}

            {/* Subtle Explorer link */}
            <div className="mt-6 pt-6 border-t border-gold-hairline text-center">
              <button 
                onClick={() => navigate('/annuaire')}
                className="inline-flex items-center gap-2 text-sm font-medium text-text-light-muted hover:text-patina-deep transition-colors"
              >
                <Search size={16} />
                <span>Explorer l'annuaire librement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
          <div className="flex flex-col items-center text-center p-6 bg-paper-raised rounded-2xl shadow-sm ring-1 ring-gold-hairline">
            <div className="h-12 w-12 rounded-full bg-patina-verdigris/10 flex items-center justify-center mb-4 text-patina-deep">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-ink-base mb-2">Modération</h3>
            <p className="text-sm text-text-light-muted leading-relaxed">
              Une charte de respect stricte et une modération active pour un espace sécurisant.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-paper-raised rounded-2xl shadow-sm ring-1 ring-gold-hairline">
            <div className="h-12 w-12 rounded-full bg-kinpaku-gold/10 flex items-center justify-center mb-4 text-kinpaku-gold">
              <BadgeCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-ink-base mb-2">Vérifié</h3>
            <p className="text-sm text-text-light-muted leading-relaxed">
              Des badges de confiance attribués pour rassurer et guider vos échanges.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-paper-raised rounded-2xl shadow-sm ring-1 ring-gold-hairline">
            <div className="h-12 w-12 rounded-full bg-error-50 flex items-center justify-center mb-4 text-error-600">
              <Heart size={24} />
            </div>
            <h3 className="text-base font-bold text-ink-base mb-2">Bienveillant</h3>
            <p className="text-sm text-text-light-muted leading-relaxed">
              Pensé pour et par la communauté, privilégiant l'entraide et l'inclusivité.
            </p>
          </div>
        </div>

        {/* Comprehensive Presentation & Categories (Bento-style) */}
        <div className="mt-32 w-full">
          
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-ink-base mb-6 tracking-tight">
              La plateforme de services LGBTQIA+ entre membres
            </h2>
            <p className="text-lg text-text-light-muted max-w-2xl mx-auto leading-relaxed">
              Pas juste un annuaire. C'est avant tout un espace de mise en relation pour la communauté queer. Que ce soit pour un coup de main, trouver un·e pro ou échanger sur le forum, vous êtes au bon endroit.
            </p>
          </div>

          {/* Categories Grid - Bento Style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto mb-24">
            {[
              { label: 'Bricolage & Travaux', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50', border: 'ring-amber-200' },
              { label: 'Ménage & Aide', icon: SprayCan, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'ring-cyan-200' },
              { label: 'Garde d\'animaux', icon: PawPrint, color: 'text-orange-600', bg: 'bg-orange-50', border: 'ring-orange-200' },
              { label: 'Jardinage', icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'ring-emerald-200' },
              { label: 'Tech & Informatique', icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-50', border: 'ring-blue-200' },
              { label: 'Transport & Déménagement', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'ring-indigo-200' },
              { label: 'Garde d\'enfants', icon: Baby, color: 'text-pink-600', bg: 'bg-pink-50', border: 'ring-pink-200' },
              { label: 'Beauté & Bien-être', icon: Scissors, color: 'text-rose-600', bg: 'bg-rose-50', border: 'ring-rose-200' },
            ].map(({ label, icon: Icon, color, bg, border }) => (
              <button
                key={label}
                onClick={() => navigate('/annuaire')}
                className="group flex flex-col items-center gap-4 rounded-3xl bg-paper-raised p-6 text-center shadow-sm ring-1 ring-gold-hairline transition-all hover:-translate-y-1 hover:shadow-card hover:ring-patina-deep"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bg} ring-1 ${border} ${color} transition-transform group-hover:scale-110`}>
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-bold tracking-wide text-ink-base">{label}</span>
              </button>
            ))}
          </div>

          {/* Detailed 3-Step Process */}
          <div className="bg-paper-deep rounded-[3rem] p-8 sm:p-16 ring-1 ring-gold-hairline relative overflow-hidden">
            <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-kinpaku-gold/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-patina-verdigris/10 blur-[80px]" />
            
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-base mb-12 text-center relative z-10">
              Comment trouver un service LGBTQIA+ ?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm ring-1 ring-gold-hairline flex items-center justify-center text-xl font-black text-patina-deep mb-6 rotate-3">
                  1
                </div>
                <h3 className="text-xl font-bold text-ink-base mb-3">Créez votre profil</h3>
                <p className="text-[15px] text-text-light-muted leading-relaxed">
                  Inscrivez-vous gratuitement en tant que particulier, professionnel·le ou association. Remplissez votre bio et précisez si vous êtes là pour offrir ou chercher des services.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm ring-1 ring-gold-hairline flex items-center justify-center text-xl font-black text-patina-deep mb-6 -rotate-3">
                  2
                </div>
                <h3 className="text-xl font-bold text-ink-base mb-3">Déclarez vos besoins</h3>
                <p className="text-[15px] text-text-light-muted leading-relaxed">
                  Ajoutez des "Compétences" (les talents que vous mettez à disposition) ou des "Besoins" (ce que vous recherchez). Le moteur de recherche fera le reste !
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm ring-1 ring-gold-hairline flex items-center justify-center text-xl font-black text-patina-deep mb-6 rotate-6">
                  3
                </div>
                <h3 className="text-xl font-bold text-ink-base mb-3">Échangez en sécurité</h3>
                <p className="text-[15px] text-text-light-muted leading-relaxed">
                  Utilisez la messagerie intégrée pour discuter des modalités. Après la prestation, laissez un avis pour faire grandir la confiance au sein de la communauté.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer / legal links */}
      <footer className="border-t border-gold-hairline px-6 py-12 pb-32 text-center sm:pb-12 bg-paper-raised mt-20">
        <p className="text-[11px] uppercase tracking-widest text-text-light-faint">© {new Date().getFullYear()} Queer Service</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <button onClick={() => navigate('/ressources')} className="text-[11px] uppercase tracking-widest font-medium text-patina-deep hover:text-patina-verdigris transition-colors">
            Ressources &amp; numéros d'aide
          </button>
          <button onClick={() => navigate('/mentions-legales')} className="text-[11px] uppercase tracking-widest text-text-light-muted hover:text-patina-deep transition-colors">
            Mentions légales
          </button>
          <button onClick={() => navigate('/cgu')} className="text-[11px] uppercase tracking-widest text-text-light-muted hover:text-patina-deep transition-colors">
            CGU
          </button>
          <button onClick={() => navigate('/confidentialite')} className="text-[11px] uppercase tracking-widest text-text-light-muted hover:text-patina-deep transition-colors">
            Confidentialité
          </button>
          <button onClick={() => navigate('/cookies')} className="text-[11px] uppercase tracking-widest text-text-light-muted hover:text-patina-deep transition-colors">
            Cookies
          </button>
        </div>
      </footer>
    </div>
  );
}
