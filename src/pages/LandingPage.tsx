import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { RainbowExplorer } from '@/components/RainbowExplorer';
import {
  Heart,
  ShieldCheck,
  Users,
  Sparkles,
  HandHeart,
  Search,
  Star,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const values = [
  {
    icon: ShieldCheck,
    title: 'Un espace safe et vérifié',
    desc: 'Profils vérifiés, charte de respect, badges de confiance et modération communautaire.',
    color: 'text-primary-600 bg-primary-50',
  },
  {
    icon: HandHeart,
    title: 'L\'entraide, marchande et non marchande',
    desc: 'Proposez vos compétences ou cherchez de l\'aide. Échangez, transmettez, soutenez-vous.',
    color: 'text-secondary-600 bg-secondary-50',
  },
  {
    icon: Users,
    title: 'Par et pour la communauté',
    desc: 'Une plateforme créée par la communauté LGBT+, qui valorise les talents de chacun·e.',
    color: 'text-accent-600 bg-accent-50',
  },
];

const steps = [
  { n: '01', title: 'Créez votre profil', desc: 'Choisissez vos pronoms, présentez vos compétences et vos besoins.' },
  { n: '02', title: 'Explorez l\'annuaire', desc: 'Filtrez par catégorie, ville, badges et notes pour trouver la bonne personne.' },
  { n: '03', title: 'Échangez en confiance', desc: 'Contactez, échangez, et laissez un avis pour renforcer la communauté.' },
];

export function LandingPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
        <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -left-32 top-40 -z-10 h-96 w-96 rounded-full bg-secondary-200/30 blur-3xl" />

        <div className="container-app py-12">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-primary-700 shadow-soft ring-1 ring-primary-100">
              <Sparkles size={14} /> Fait pour nous, par nous.
            </span>
            <h1 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-neutral-900">
              Nos talents,<br />
              <span className="bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
                notre force.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-neutral-600">
              Queer Service est la plateforme d'entraide de la communauté LGBT+. Trouvez des prestataires de confiance,
              partagez vos compétences et renforcez les liens communautaires — dans un espace vérifié et bienveillant.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => navigate(user ? '/annuaire' : '/inscription')} className="btn-primary btn-lg group">
                {user ? 'Explorer l\'annuaire' : 'Rejoindre la communauté'}
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </button>
              <button onClick={() => navigate('/annuaire')} className="btn-outline btn-lg">
                Découvrir les services
              </button>
            </div>
            <p className="mt-4 text-sm text-neutral-400">Inscription gratuite · Espace safe · Hébergement UE</p>
          </div>
        </div>
      </section>

      {/* Rainbow explorer — search + themes */}
      <section className="bg-white py-10">
        <div className="container-app">
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <h2 className="section-title">Explorez l'arc-en-ciel</h2>
            <p className="mt-2 text-neutral-600">8 thèmes, des centaines de services. Touchez une couleur pour découvrir ses sous-thèmes.</p>
          </div>
          <RainbowExplorer navigateOnSelect={false} />
        </div>
      </section>

      {/* Values */}
      <section className="bg-neutral-50 py-12">
        <div className="container-app">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Heart size={14} fill="currentColor" /> Philosophie Ubuntu
            </span>
            <h2 className="mt-4 section-title">« Je suis parce que nous sommes »</h2>
            <p className="mt-3 text-neutral-600">
              Chaque personne possède des compétences précieuses. En les partageant, la communauté devient plus forte,
              plus autonome et plus solidaire.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="card p-7 transition hover:shadow-glow">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${v.color}`}>
                  <v.icon size={22} />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-neutral-900">{v.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-12">
        <div className="container-app">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="section-title">Comment ça marche</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-semibold text-primary-200">{s.n}</span>
                <h3 className="mt-3 font-display text-xl font-semibold text-neutral-900">{s.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-12 text-white">
        <div className="container-app">
          <div className="grid items-center gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <h2 className="font-display text-3xl font-semibold">La confiance, au cœur de tout.</h2>
              <p className="mt-3 text-primary-100">
                Vérification d'identité, badges communautaires, avis double sens et modération : chaque couche renforce
                la sécurité des échanges.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 md:col-span-2">
              {[
                { icon: ShieldCheck, label: 'Identité vérifiée' },
                { icon: Star, label: 'Avis communautaires' },
                { icon: CheckCircle2, label: 'Charte de respect' },
                { icon: Search, label: 'Annuaire filtrable' },
                { icon: Users, label: 'Membres bienveillants' },
                { icon: Heart, label: 'Entraide solidaire' },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <f.icon size={20} />
                  </div>
                  <span className="text-xs font-medium text-primary-100">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-50 py-14">
        <div className="container-app">
          <div className="mx-auto max-w-2xl rounded-5xl bg-gradient-to-br from-primary-600 to-secondary-500 p-10 text-center text-white shadow-glow md:p-16">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Rejoignez l'entraide communautaire</h2>
            <p className="mx-auto mt-4 max-w-lg text-primary-100">
              Inscrivez-vous gratuitement, créez votre profil et commencez à échanger dès aujourd'hui.
            </p>
            <button
              onClick={() => navigate(user ? '/annuaire' : '/inscription')}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-primary-700 shadow-soft transition hover:scale-105 active:scale-95"
            >
              {user ? 'Explorer l\'annuaire' : 'Créer mon compte'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
