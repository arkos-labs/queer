import { useRouter } from '@/lib/router';
import {
  ShieldCheck,
  Users,
  Sparkles,
  Wrench,
  SprayCan,
  PawPrint,
  Leaf,
  Monitor,
  Truck,
  Baby,
  Scissors,
  ArrowRight,
  BadgeCheck,
  Lock,
  Heart,
} from 'lucide-react';

const CATEGORIES = [
  { label: 'Bricolage', icon: Wrench },
  { label: 'Ménage', icon: SprayCan },
  { label: 'Animaux', icon: PawPrint },
  { label: 'Jardin', icon: Leaf },
  { label: 'Tech', icon: Monitor },
  { label: 'Transport', icon: Truck },
  { label: 'Enfants', icon: Baby },
  { label: 'Beauté', icon: Scissors },
];

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Charte de respect',
    desc: 'Chaque membre accepte une charte de respect avant de pouvoir échanger. Tout manquement peut entraîner une suspension.',
  },
  {
    icon: BadgeCheck,
    title: 'Badges de confiance',
    desc: 'Identité vérifiée, accueil handi-inclusif, expertise sur cheveux texturés… des badges attribués par la communauté et la modération.',
  },
  {
    icon: Lock,
    title: 'Vos données, vos droits',
    desc: 'Export et suppression de vos données à tout moment, hébergement dans l\'Union Européenne, conformément au RGPD.',
  },
];

export function LandingPage() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-white font-sans animate-fade-in text-neutral-800">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle dark glowing orbs (Patina and Gold) */}
        <div className="pointer-events-none absolute -right-32 -top-24 h-80 w-80 rounded-full bg-primary-100/30 blur-[100px]" />
        <div className="pointer-events-none absolute -left-32 top-32 h-80 w-80 rounded-full bg-primary-50 blur-[100px]" />
        
        <div className="container-app relative py-14 text-center sm:py-24">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-white shadow-card ring-1 ring-neutral-200">
            <img src="/logo.png" alt="Queer Service" className="h-14 w-14 object-contain" />
          </div>

          <h1 className="mx-auto mt-8 max-w-3xl font-display text-5xl font-light leading-[1.08] text-neutral-900 sm:text-7xl tracking-tight">
            Fait pour nous,
            <br />
            <span className="text-primary-600 italic font-medium">par nous.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-neutral-500 sm:text-lg">
            Queer Service est l'annuaire d'entraide de la communauté LGBTQI+&nbsp;: trouvez et proposez des services
            en toute confiance, entre membres.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button onClick={() => navigate('/inscription')} className="btn-primary btn-lg w-full sm:w-auto uppercase tracking-widest text-sm">
              Rejoindre la communauté <ArrowRight size={16} className="ml-2" />
            </button>
            <button onClick={() => navigate('/connexion')} className="btn-outline btn-lg w-full sm:w-auto uppercase tracking-widest text-sm">
              Se connecter
            </button>
          </div>

          <p className="mt-6 text-xs text-neutral-400 tracking-wider uppercase">
            <span className="inline-flex items-center gap-1.5"><Heart size={12} className="fill-primary-600 text-primary-600" /> Rejoins plus de membres de la communauté</span>
          </p>
        </div>
      </section>

      {/* Categories preview */}
      <section className="container-app py-12 sm:py-20 border-t border-neutral-100">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-xs font-medium uppercase tracking-widest text-neutral-500">
            Des services pour tous les besoins
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {CATEGORIES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => navigate('/annuaire')}
                className="group flex flex-col items-center gap-4 rounded-md bg-white p-6 text-center shadow-card ring-1 ring-neutral-200 transition hover:-translate-y-1 hover:shadow-lift hover:ring-primary-500"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 border border-neutral-200 text-primary-600 transition group-hover:bg-primary-50">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium tracking-wide uppercase text-neutral-900">{label}</span>
              </button>
            ))}
          </div>
          <p className="mt-10 text-center text-xs tracking-wider text-neutral-400 uppercase">
            Et bien d'autres&nbsp;: santé &amp; bien-être, administratif &amp; juridique, coaching, communauté…
          </p>
        </div>
      </section>

      {/* Trust values */}
      <section className="border-y border-neutral-200 bg-neutral-100 py-16 sm:py-24">
        <div className="container-app">
          <h2 className="section-title text-center">La confiance au cœur</h2>
          <p className="mx-auto mt-4 max-w-md text-center text-[15px] text-neutral-500">
            Une plateforme pensée pour protéger et valoriser chaque membre.
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-md bg-white p-8 shadow-card ring-1 ring-neutral-200 transition-colors hover:ring-primary-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <v.icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="mt-6 font-display text-[20px] font-medium text-neutral-900 tracking-wide uppercase">{v.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="container-app py-16 text-center sm:py-24">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-md bg-white p-12 text-neutral-900 shadow-lift ring-1 ring-primary-500 sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-100/30 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary-50 blur-[80px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-primary-400/50" />

          <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 ring-1 ring-primary-300">
            <Users size={24} className="text-primary-600" strokeWidth={1.5} />
          </div>
          <h2 className="relative z-10 mt-8 font-display text-3xl font-light tracking-tight sm:text-4xl text-neutral-900">
            Particulier·e, professionnel·le ou association&nbsp;?
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-md text-[15px] text-neutral-500 leading-relaxed">
            Créez votre profil en quelques minutes et rejoignez un annuaire pensé pour et par la communauté.
          </p>
          <button onClick={() => navigate('/inscription')} className="btn-primary btn-lg mt-10 relative z-10 uppercase tracking-widest text-sm">
            <Sparkles size={16} className="mr-2" /> Créer mon profil
          </button>
        </div>
      </section>

      {/* Footer / legal links */}
      <footer className="border-t border-neutral-200 px-6 py-12 pb-32 text-center sm:pb-12 bg-white">
        <p className="text-[11px] uppercase tracking-widest text-neutral-400">© {new Date().getFullYear()} Queer Service</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <a href="#/ressources" className="text-[11px] uppercase tracking-widest font-medium text-primary-600 hover:text-primary-500 transition-colors">
            Ressources &amp; numéros d'aide
          </a>
          <a href="#/mentions-legales" className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-primary-600 transition-colors">
            Mentions légales
          </a>
          <a href="#/cgu" className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-primary-600 transition-colors">
            CGU
          </a>
          <a href="#/confidentialite" className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-primary-600 transition-colors">
            Confidentialité
          </a>
          <a href="#/cookies" className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-primary-600 transition-colors">
            Cookies
          </a>
        </div>
      </footer>
    </div>
  );
}
