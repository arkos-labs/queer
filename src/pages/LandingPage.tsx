import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
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
  const { devLogin } = useAuth();

  const handleDevLogin = () => {
    devLogin?.();
    navigate('/annuaire');
  };

  return (
    <div className="min-h-screen bg-white font-sans animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden px-6 pb-10 pt-10">
        <div className="absolute -right-24 -top-16 -z-10 h-64 w-64 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -left-24 bottom-0 -z-10 h-64 w-64 rounded-full bg-secondary-200/30 blur-3xl" />

        {import.meta.env.DEV && devLogin && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-warning-300 bg-warning-50 px-4 py-2.5">
            <span className="text-[11px] font-medium text-warning-700">
              Mode développement — Supabase non connecté
            </span>
            <button
              onClick={handleDevLogin}
              className="shrink-0 rounded-full bg-warning-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-warning-700 transition-colors"
            >
              Connexion dev
            </button>
          </div>
        )}

        <img src="/logo.png" alt="Queer Service" className="mx-auto h-14 w-14 object-contain" />

        <h1 className="mt-5 text-center font-display text-3xl font-bold leading-tight text-neutral-900">
          Fait pour nous,
          <br />
          par nous.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] text-neutral-500">
          Queer Service est l'annuaire d'entraide de la communauté LGBTQI+&nbsp;: trouvez et proposez des services
          en toute confiance, entre membres.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button onClick={() => navigate('/inscription')} className="btn-primary w-full">
            Rejoindre la communauté <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/connexion')} className="btn-outline w-full">
            Se connecter
          </button>
        </div>
      </div>

      {/* Categories preview */}
      <div className="border-t border-neutral-100 px-6 py-8">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Des services pour tous les besoins
        </h2>
        <div className="mt-5 grid grid-cols-4 gap-4">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700">
                <Icon size={20} />
              </div>
              <span className="text-[11px] font-medium text-neutral-600">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-neutral-400">
          Et bien d'autres&nbsp;: santé &amp; bien-être, administratif &amp; juridique, coaching, communauté…
        </p>
      </div>

      {/* Trust values */}
      <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-8">
        <div className="space-y-5">
          {VALUES.map((v) => (
            <div key={v.title} className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-soft">
                <v.icon size={20} />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-semibold text-neutral-900">{v.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community CTA */}
      <div className="border-t border-neutral-100 px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
          <Users size={22} />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold text-neutral-900">
          Particulier·e, professionnel·le ou association&nbsp;?
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-neutral-500">
          Créez votre profil en quelques minutes et rejoignez un annuaire pensé pour et par la communauté.
        </p>
        <button onClick={() => navigate('/inscription')} className="btn-primary mt-6">
          <Sparkles size={16} /> Créer mon profil
        </button>
      </div>

      {/* Footer / legal links */}
      <footer className="border-t border-neutral-100 px-6 py-8 pb-24 text-center">
        <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Queer Service</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          <a href="#/ressources" className="text-xs font-medium text-primary-600 hover:underline">
            Ressources &amp; numéros d'aide
          </a>
          <a href="#/mentions-legales" className="text-xs text-neutral-400 hover:text-primary-600 hover:underline">
            Mentions légales
          </a>
          <a href="#/cgu" className="text-xs text-neutral-400 hover:text-primary-600 hover:underline">
            CGU
          </a>
          <a href="#/confidentialite" className="text-xs text-neutral-400 hover:text-primary-600 hover:underline">
            Confidentialité
          </a>
          <a href="#/cookies" className="text-xs text-neutral-400 hover:text-primary-600 hover:underline">
            Cookies
          </a>
        </div>
      </footer>
    </div>
  );
}
