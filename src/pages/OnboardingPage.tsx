import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { AccountType, Civilite } from '@/lib/types';
import { Heart, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Search, HandHeart, Plus, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceInput } from '@/components/PriceInput';

type Intent = 'seeking' | 'offering' | 'both';

const intents: { value: Intent; label: string; desc: string; icon: typeof Search }[] = [
  { value: 'seeking', label: 'Je cherche un service', desc: 'J\'ai besoin d\'aide pour quelque chose.', icon: Search },
  { value: 'offering', label: 'Je propose un service', desc: 'J\'ai des compétences à offrir à la communauté.', icon: HandHeart },
  { value: 'both', label: 'Les deux', desc: 'Je cherche et je propose selon les moments.', icon: Heart },
];

const civilites: { value: Civilite; label: string }[] = [
  { value: 'Monsieur', label: 'Monsieur' },
  { value: 'Madame', label: 'Madame' },
  { value: 'Mx', label: 'Mx' },
  { value: 'Iel', label: 'Iel' },
  { value: 'Autre', label: 'Autre / je préfère ne pas préciser' },
];

const accountTypes: { value: AccountType; label: string; desc: string; icon: string }[] = [
  { value: 'particulier', label: 'Particulier·e', desc: 'Je propose et/ou je cherche des services entre membres.', icon: '🤝' },
  { value: 'asso', label: 'Association / structure', desc: 'Structure partenaire, association LGBTQI+ ou centre de santé.', icon: '🏳️‍🌈' },
];

const RATE_UNITS = ['/ heure', '/ jour', '/ prestation', '/ mois'];

const appendUnit = (current: string, unit: string) => {
  const withoutUnit = RATE_UNITS.reduce(
    (acc, u) => (acc.endsWith(u) ? acc.slice(0, acc.length - u.length).trimEnd() : acc),
    current.trim(),
  );
  if (!withoutUnit) return withoutUnit;
  return `${withoutUnit} ${unit}`;
};

const chartePoints = [
  'Je m\'engage à respecter chaque membre, quelle que soit son orientation sexuelle, son identité ou son expression de genre.',
  'Je n\'utilise pas de langage discriminant, haineux, stigmatisant ou de propos transphobes, homophobes, biphobes ou racistes.',
  'Je respecte les pronoms et civilités choisies par chacun·e, y compris lorsqu\'ils diffèrent de mes habitudes.',
  'Je ne harcèle pas, je ne démarche pas de façon abusive ou insistante, et je n\'utilise pas la messagerie à des fins de drague non sollicitée.',
  'Je décris honnêtement les services que je propose ou que je recherche, et je ne dissimule pas d\'information importante sur le prix ou la prestation.',
  'Une fois une mission acceptée, je m\'engage à la réaliser sérieusement ou à prévenir au plus vite en cas d\'empêchement.',
  'Je respecte la vie privée des autres membres : je ne partage pas leurs informations personnelles ou nos échanges en dehors de la plateforme sans leur accord.',
  'Je privilégie des lieux et horaires sûrs pour les rencontres liées à une prestation, et je respecte le droit de chacun·e à refuser ou interrompre un échange à tout moment.',
  'Je signale tout comportement contraire à cette charte plutôt que de laisser une situation dégénérer.',
  'Je comprends que tout manquement à cette charte peut entraîner un avertissement, une suspension ou une suppression définitive de mon compte.',
];

export function OnboardingPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [civilite, setCivilite] = useState<Civilite | null>(null);
  const [pronouns, setPronouns] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('particulier');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [rateAmount, setRateAmount] = useState('');
  const [rateUnit, setRateUnit] = useState('/ heure');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetUnit, setBudgetUnit] = useState('/ prestation');
  const [skillInput, setSkillInput] = useState('');
  const [needInput, setNeedInput] = useState('');
  const [charteAccepted, setCharteAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    navigate('/connexion');
    return null;
  }

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) {
      setSkills((s) => [...s, v]);
      setSkillInput('');
    }
  };
  const addNeed = () => {
    const v = needInput.trim();
    if (v && !needs.includes(v)) {
      setNeeds((n) => [...n, v]);
      setNeedInput('');
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    setError(null);
    const finalRates = rateAmount.trim() ? `${rateAmount.trim()}€ ${rateUnit}` : null;
    const finalBudget = budgetAmount.trim() ? `${budgetAmount.trim()}€ ${budgetUnit}` : null;

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      email: user.email,
      civilite,
      city: city.trim() || null,
      pronouns: pronouns || null,
      account_type: accountType,
      skills,
      needs,
      indicative_rates: finalRates,
      budget_indicatif: finalBudget,
      charte_accepted: true,
      charte_accepted_at: new Date().toISOString(),
      profile_status: 'active',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshProfile();
    navigate('/profil?bienvenue=1');
  };

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = step === 0 ? displayName.trim().length > 0 : step === 2 ? !!intent : step === 3 ? charteAccepted : true;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-neutral-50 px-4 py-12">
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={async () => { await signOut(); navigate('/'); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm"
        >
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>

      <div className="absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="absolute -left-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-secondary-200/30 blur-3xl" />

      <div className="mx-auto max-w-xl">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === step ? 'w-10 bg-primary-600' : i < step ? 'w-8 bg-primary-400' : 'w-8 bg-neutral-200',
              )}
            />
          ))}
        </div>

        <div className="card animate-scale-in p-8 md:p-10">
          {step === 0 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Sparkles size={22} />
                </div>
                <h2 className="font-display text-2xl font-semibold text-neutral-900">Bienvenue, qui es-tu ?</h2>
                <p className="mt-2 text-sm text-neutral-500">Choisis ton nom d'affichage, ta civilité et tes pronoms.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="label">Nom affiché publiquement</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                    placeholder="Ex. Alex Martin"
                    required
                  />
                </div>

                <div>
                  <label className="label">Dans quelle ville ou région êtes-vous ?</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input"
                    placeholder="Ex. Paris, Île-de-France, ou À distance"
                  />
                </div>

                <div>
                  <label className="label">Civilité</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {civilites.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCivilite(c.value)}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-sm font-medium transition',
                          civilite === c.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Pronoms (optionnel)</label>
                  <input
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="input"
                    placeholder="Ex. iel / elle / il / ils / elles"
                  />
                  <p className="mt-1.5 text-xs text-neutral-400">Personnalisable au-delà de M./Mme/Iel.</p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
                  <Heart size={22} fill="currentColor" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-neutral-900">Ton rôle dans la communauté</h2>
                <p className="mt-2 text-sm text-neutral-500">Tu pourras toujours modifier cela plus tard.</p>
              </div>

              <div className="space-y-3">
                {accountTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAccountType(t.value)}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition',
                      accountType === t.value
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-neutral-200 bg-white hover:border-neutral-300',
                    )}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900">{t.label}</span>
                        {accountType === t.value && <CheckCircle2 size={16} className="text-primary-600" />}
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-500">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
                  <Search size={22} />
                </div>
                <h2 className="font-display text-2xl font-semibold text-neutral-900">Que viens-tu faire ici ?</h2>
                <p className="mt-2 text-sm text-neutral-500">Ça nous aide à personnaliser ton profil. Modifiable à tout moment.</p>
              </div>

              <div className="space-y-3">
                {intents.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setIntent(t.value)}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition',
                      intent === t.value
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-neutral-200 bg-white hover:border-neutral-300',
                    )}
                  >
                    <t.icon size={20} className="mt-0.5 shrink-0 text-primary-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900">{t.label}</span>
                        {intent === t.value && <CheckCircle2 size={16} className="text-primary-600" />}
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-500">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {(intent === 'offering' || intent === 'both') && (
                <div className="mt-5 animate-slide-up">
                  <label className="label">Ce que tu proposes</label>
                  <div className="flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="input"
                      placeholder="Ex. Montage de meubles IKEA"
                    />
                    <button type="button" onClick={addSkill} className="btn-outline shrink-0">
                      <Plus size={16} /> Ajouter
                    </button>
                  </div>
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm text-primary-700">
                          {s}
                          <button type="button" onClick={() => setSkills((arr) => arr.filter((x) => x !== s))} className="text-primary-400 hover:text-primary-700">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="label">Tes tarifs (optionnel)</label>
                    <div className="flex gap-2 mt-1.5">
                      <PriceInput
                        value={rateAmount}
                        onChange={setRateAmount}
                        placeholder="Ex. 30, ou entre 20 et 40"
                        className="flex-1"
                      />
                      <select
                        value={rateUnit}
                        onChange={(e) => setRateUnit(e.target.value)}
                        className="input w-auto shrink-0 bg-neutral-50"
                      >
                        <option value="/ heure">/ heure</option>
                        <option value="/ jour">/ jour</option>
                        <option value="/ mois">/ mois</option>
                        <option value="/ prestation">/ prestation</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-400">
                      Ça donne aux client·es une idée du prix avant qu'iels ne demandent un devis.
                    </p>
                  </div>
                </div>
              )}

              {(intent === 'seeking' || intent === 'both') && (
                <div className="mt-5 animate-slide-up">
                  <label className="label">Ce que tu recherches</label>
                  <div className="flex gap-2">
                    <input
                      value={needInput}
                      onChange={(e) => setNeedInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeed())}
                      className="input"
                      placeholder="Ex. Aide administrative"
                    />
                    <button type="button" onClick={addNeed} className="btn-outline shrink-0">
                      <Plus size={16} /> Ajouter
                    </button>
                  </div>
                  {needs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {needs.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-secondary-50 px-3 py-1.5 text-sm text-secondary-700">
                          {s}
                          <button type="button" onClick={() => setNeeds((arr) => arr.filter((x) => x !== s))} className="text-secondary-400 hover:text-secondary-700">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="label">Budget indicatif (optionnel)</label>
                    <div className="flex gap-2 mt-1.5">
                      <PriceInput
                        value={budgetAmount}
                        onChange={setBudgetAmount}
                        placeholder="Ex. 40"
                        className="flex-1"
                      />
                      <select
                        value={budgetUnit}
                        onChange={(e) => setBudgetUnit(e.target.value)}
                        className="input w-auto shrink-0 bg-neutral-50"
                      >
                        <option value="/ heure">/ heure</option>
                        <option value="/ jour">/ jour</option>
                        <option value="/ mois">/ mois</option>
                        <option value="/ prestation">/ prestation</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-400">
                      Indique à quel prix tu recherches ce service — ça aide les prestataires à savoir si leur tarif
                      correspond.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                  <ShieldCheck size={22} />
                </div>
                <h2 className="font-display text-2xl font-semibold text-neutral-900">Charte de respect</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  L'acceptation de la charte conditionne l'accès à la messagerie et aux échanges.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl bg-neutral-50 p-5">
                {chartePoints.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-500" />
                    <span className="text-sm text-neutral-700">{p}</span>
                  </div>
                ))}
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-4 transition hover:bg-neutral-50">
                <input
                  type="checkbox"
                  checked={charteAccepted}
                  onChange={(e) => setCharteAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-800">
                  J'ai lu et j'accepte la charte de respect de Queer Service.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={step === 0 ? () => navigate('/') : back}
              className="btn-ghost"
            >
              <ArrowLeft size={16} /> {step === 0 ? 'Annuler' : 'Retour'}
            </button>
            {step < 3 ? (
              <button onClick={next} disabled={!canProceed} className="btn-primary">
                Continuer <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={finishOnboarding} disabled={!canProceed || loading} className="btn-primary">
                {loading ? 'Enregistrement…' : 'Finaliser mon inscription'}
                {!loading && <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
