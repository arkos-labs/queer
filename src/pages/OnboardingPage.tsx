import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { AccountType, Category, Civilite, Profile, Subcategory } from '@/lib/types';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import { Heart, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, UserRound, Search, HandHeart, Plus, X, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandHeader } from '@/components/BrandHeader';

type Intent = 'seeking' | 'offering';

const intents: { value: Intent; label: string; desc: string; icon: typeof Search }[] = [
  { value: 'seeking', label: 'Je cherche un service', desc: 'J\'ai besoin d\'aide pour quelque chose.', icon: Search },
  { value: 'offering', label: 'Je propose un service', desc: 'J\'ai des compétences à offrir à la communauté.', icon: HandHeart },
];

const civilites: { value: Civilite; label: string }[] = [
  { value: 'Il', label: 'Il' },
  { value: 'Elle', label: 'Elle' },
  { value: 'Iel', label: 'Iel' },
  { value: 'Ielle', label: 'Ielle' },
  { value: 'Ne se prononce pas', label: 'Ne se prononce pas' },
];

const accountTypes: { value: AccountType; label: string; desc: string; icon: string }[] = [
  { value: 'particulier', label: 'Particulier·e', desc: 'Je propose et/ou je cherche des services entre membres.', icon: '🤝' },
  { value: 'pro', label: 'Professionnel·le', desc: 'Structure partenaire, professionnel·le ou centre de santé.', icon: '💼' },
];

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

function ServicePicker({
  title,
  categories,
  subcategories,
  selected,
  onToggle,
}: {
  title: string;
  categories: Category[];
  subcategories: Subcategory[];
  selected: string[];
  onToggle: (subcategory: Subcategory) => void;
}) {
  return (
    <div className="mt-5">
      <p className="label">{title}</p>
      <p className="mb-3 text-xs text-ink-muted">Choisis parmi les prestations déjà présentes dans l’annuaire.</p>
      <div className="space-y-4">
        {categories.map((category) => {
          const services = subcategories.filter((subcategory) => subcategory.category_id === category.id);
          if (!services.length) return null;
          return (
            <div key={category.id}>
              <p className="mb-2 text-xs font-bold text-ink-base">{category.label}</p>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => {
                  const active = selected.includes(service.label);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => onToggle(service)}
                      className={cn(
                        'rounded-full border px-3 py-2 text-xs font-semibold transition-all',
                        active
                          ? 'border-patina-deep bg-patina-deep text-white shadow-soft'
                          : 'border-gold-hairline bg-white text-ink-muted hover:bg-paper-base',
                      )}
                    >
                      {active && <CheckCircle2 size={13} className="mr-1 inline" />}
                      {service.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const { user, profile, setProfile: setAuthProfile } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [isCommunityMember, setIsCommunityMember] = useState<boolean | null>(null);
  const [isAlly, setIsAlly] = useState(false);
  const [showAllyModal, setShowAllyModal] = useState(false);
  const [civilite, setCivilite] = useState<Civilite | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [selectedIntents, setSelectedIntents] = useState<Set<Intent>>(new Set());
  const [noneSelected, setNoneSelected] = useState(false);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(FALLBACK_SUBCATEGORIES);
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [needInput, setNeedInput] = useState('');
  const [charteAccepted, setCharteAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTaxonomy = async () => {
      const [categoriesResult, subcategoriesResult] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
      ]);
      if (!categoriesResult.error && !subcategoriesResult.error && categoriesResult.data?.length) {
        setCategories(categoriesResult.data as Category[]);
        setSubcategories((subcategoriesResult.data ?? []) as Subcategory[]);
      }
    };
    loadTaxonomy();
  }, []);

  if (!user) {
    navigate('/connexion');
    return null;
  }

  if (profile && profile.display_name) {
    navigate('/annuaire');
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

  const togglePreset = (subcategory: Subcategory, target: Intent) => {
    const update = target === 'offering' ? setSkills : setNeeds;
    update((current) => current.includes(subcategory.label)
      ? current.filter((item) => item !== subcategory.label)
      : [...current, subcategory.label]);
    if (target === 'offering') {
      setSelectedSubIds((current) => {
        const next = new Set(current);
        if (next.has(subcategory.id)) next.delete(subcategory.id); else next.add(subcategory.id);
        return next;
      });
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    setError(null);
    const finalRates = null;
    const finalBudget = null;

    // Use the row the upsert itself returns (same request, so guaranteed
    // fresh and correct) and push it straight into the auth context. Doing
    // a separate refetch-then-navigate here left a real window where
    // navigate() could land on a route before the context's `profile` had
    // actually updated, and every protected route bounces back to
    // /onboarding as long as `profile` reads as null — which looked like
    // "the signup didn't happen" (back to the display-name step) even
    // though the account was created fine.
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        email: user.email,
        civilite,
        city: city.trim() || null,
        pronouns: null,
        account_type: accountType ?? 'particulier',
        skills,
        needs,
        indicative_rates: finalRates,
        budget_indicatif: finalBudget,
        is_community_member: isCommunityMember,
        is_ally: isAlly,
        charte_accepted: true,
        charte_accepted_at: new Date().toISOString(),
        profile_status: 'active',
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (selectedSubIds.size > 0) {
      const { error: servicesError } = await supabase
        .from('profile_subcategories')
        .insert(Array.from(selectedSubIds).map((subcategory_id) => ({ profile_id: user.id, subcategory_id })));
      if (servicesError) {
        setError(servicesError.message);
        return;
      }
    }
    // Keeps the proof that the e-mail code was entered (signup session).
    await supabase.rpc('mark_email_code_verified');
    setAuthProfile(data as Profile);
    navigate('/annuaire');
  };

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = 
    step === 0 ? (isCommunityMember === true || isAlly) : 
    step === 1 ? displayName.trim().length > 0 && city.trim().length > 0 && civilite !== null : 
    step === 2 ? accountType !== null :
    step === 3 ? (noneSelected || (
      selectedIntents.size > 0 &&
      (!selectedIntents.has('offering') || skills.length > 0) &&
      (!selectedIntents.has('seeking') || needs.length > 0)
    )) :
    step === 4 ? charteAccepted : true;

  return (
    <div className="relative min-h-full overflow-hidden bg-paper-base px-5 pb-10 pt-3">
      <div className="absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="absolute -left-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-secondary-200/30 blur-3xl" />

      <div className="mx-auto max-w-xl">
        <div className="mb-3 text-center">
          <BrandHeader safeArea={false} />
          <p className="mt-1 text-xs font-semibold tracking-wide text-patina-deep">CRÉONS VOTRE PROFIL</p>
        </div>
        {/* Progress */}
        <div className="mb-5 flex items-center justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === step ? 'w-10 bg-[linear-gradient(90deg,#FF0018_0%,#FFA52C_20%,#FFFF41_40%,#008018_60%,#0000F9_80%,#86007D_100%)]' : i < step ? 'w-8 bg-patina-deep/80' : 'w-8 bg-gold-hairline',
              )}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-gold-hairline bg-white/60 backdrop-blur-sm shadow-soft animate-scale-in overflow-hidden">
          {/* Rainbow brand strip */}
          <div aria-hidden className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #FF0018 0%, #FFA52C 20%, #FFFF41 40%, #008018 60%, #0000F9 80%, #86007D 100%)' }} />
          <div className="p-8 md:p-10">
          <button
            onClick={step === 0 ? () => navigate('/') : back}
            className="mb-5 flex items-center gap-2 rounded-xl bg-white border border-gold-hairline px-4 py-2 text-sm font-semibold text-ink-muted shadow-sm transition-all hover:bg-paper-base hover:text-ink-base"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          {step === 0 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm text-patina-deep">
                  <Heart size={22} fill="currentColor" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink-base">Appartenance à la communauté</h2>
                <p className="mt-2 text-sm text-ink-muted">Cette plateforme est d'abord pensée pour la communauté LGBTQIA+.</p>
              </div>
              <div className="space-y-4">
                <label className="label">Es-tu membre de la communauté LGBTQIA+ ?</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setIsCommunityMember(true); setIsAlly(false); }} className={cn("flex-1 py-3 rounded-xl border transition-all font-medium", isCommunityMember === true ? "bg-paper-base border-patina-deep text-patina-deep ring-2 ring-patina-deep/20" : "bg-white/80 border-gold-hairline hover:bg-paper-base")}>Oui</button>
                  <button type="button" onClick={() => setIsCommunityMember(false)} className={cn("flex-1 py-3 rounded-xl border transition-all font-medium", isCommunityMember === false ? "bg-paper-base border-patina-deep text-patina-deep ring-2 ring-patina-deep/20" : "bg-white/80 border-gold-hairline hover:bg-paper-base")}>Non</button>
                </div>
                
                {isCommunityMember === false && (
                  <div className="mt-4 p-4 rounded-2xl border border-gold-hairline bg-white/60">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={isAlly} onChange={(e) => {
                        if (e.target.checked) setShowAllyModal(true);
                        else setIsAlly(false);
                      }} className="mt-1 h-4 w-4 rounded border-gold-hairline text-patina-deep" />
                      <span className="text-sm font-medium text-ink-base">Je suis un·e allié·e (Gay Friendly)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm text-patina-deep">
                  <UserRound size={22} />
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink-base">Bienvenue, qui es-tu ?</h2>
                <p className="mt-2 text-sm text-ink-muted">Choisis ton nom d'affichage, ta civilité et tes pronoms.</p>
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
                          'rounded-xl border px-3 py-3 text-sm font-medium transition-all shadow-sm',
                          civilite === c.value
                            ? 'border-patina-deep bg-paper-base text-patina-deep ring-2 ring-patina-deep/20'
                            : 'border-gold-hairline bg-white/80 text-ink-muted hover:border-gold-hairline hover:bg-paper-base',
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm text-patina-deep">
                  <Heart size={22} fill="currentColor" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink-base">Ton rôle dans la communauté</h2>
                <p className="mt-2 text-sm text-ink-muted">Tu pourras toujours modifier cela plus tard.</p>
              </div>

              <div className="space-y-3">
                {accountTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAccountType(t.value)}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all shadow-sm',
                      accountType === t.value
                        ? 'border-patina-deep bg-paper-base ring-2 ring-patina-deep/20'
                        : 'border-gold-hairline bg-white/80 hover:bg-paper-base',
                    )}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-base">{t.label}</span>
                        {accountType === t.value && <CheckCircle2 size={16} className="text-patina-deep" />}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm text-patina-deep">
                  <Search size={22} />
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink-base">Que viens-tu faire ici ?</h2>
                <p className="mt-2 text-sm text-ink-muted">Ça nous aide à personnaliser ton profil. Modifiable à tout moment. Plusieurs choix possibles.</p>
              </div>

              <div className="space-y-3">
                {intents.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setNoneSelected(false);
                      setSelectedIntents((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.value)) next.delete(t.value); else next.add(t.value);
                        return next;
                      });
                    }}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all shadow-sm',
                      selectedIntents.has(t.value)
                        ? 'border-patina-deep bg-paper-base ring-2 ring-patina-deep/20'
                        : 'border-gold-hairline bg-white/80 hover:bg-paper-base',
                    )}
                  >
                    <t.icon size={20} className="mt-0.5 shrink-0 text-patina-deep" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-base">{t.label}</span>
                        {selectedIntents.has(t.value) && <CheckCircle2 size={16} className="text-patina-deep" />}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">{t.desc}</p>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntents(new Set());
                    setNoneSelected(true);
                  }}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all shadow-sm',
                    noneSelected
                      ? 'border-patina-deep bg-paper-base ring-2 ring-patina-deep/20'
                      : 'border-gold-hairline bg-white/80 hover:bg-paper-base',
                  )}
                >
                  <Compass size={20} className="mt-0.5 shrink-0 text-patina-deep" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-base">Aucun des deux</span>
                      {noneSelected && <CheckCircle2 size={16} className="text-patina-deep" />}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">Je préfère explorer avant de me décider.</p>
                  </div>
                </button>
              </div>

              {selectedIntents.has('offering') && (
                <div className="mt-5 animate-slide-up">
                  <ServicePicker
                    title="Prestations que tu proposes"
                    categories={categories}
                    subcategories={subcategories}
                    selected={skills}
                    onToggle={(subcategory) => togglePreset(subcategory, 'offering')}
                  />
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
                        <span key={s} className="rounded-full bg-white border border-gold-hairline px-3 py-1 text-[11px] font-semibold text-ink-base shadow-sm inline-flex items-center gap-1">
                          {s}
                          <button type="button" onClick={() => setSkills((arr) => arr.filter((x) => x !== s))} className="text-patina-deep/70 hover:text-patina-deep">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                </div>
              )}

              {selectedIntents.has('seeking') && (
                <div className="mt-5 animate-slide-up">
                  <ServicePicker
                    title="Prestations que tu recherches"
                    categories={categories}
                    subcategories={subcategories}
                    selected={needs}
                    onToggle={(subcategory) => togglePreset(subcategory, 'seeking')}
                  />
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
                        <span key={s} className="rounded-full bg-paper-base border border-gold-hairline px-3 py-1 text-[11px] font-semibold text-ink-base shadow-sm inline-flex items-center gap-1">
                          {s}
                          <button type="button" onClick={() => setNeeds((arr) => arr.filter((x) => x !== s))} className="text-patina-deep/70 hover:text-patina-deep">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm text-patina-deep">
                  <ShieldCheck size={22} />
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink-base">Charte de respect</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  L'acceptation de la charte conditionne l'accès à la messagerie et aux échanges.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-gold-hairline bg-white/60 backdrop-blur-sm p-5 shadow-inner">
                {chartePoints.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-patina-deep" />
                    <span className="text-sm text-ink-base">{p}</span>
                  </div>
                ))}
              </div>

              <label
                className={cn(
                  'mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all shadow-sm',
                  charteAccepted
                    ? 'border-patina-deep bg-paper-base ring-2 ring-patina-deep/20'
                    : 'border-gold-hairline bg-white/80 hover:bg-paper-base',
                )}
              >
                <input
                  type="checkbox"
                  checked={charteAccepted}
                  onChange={(e) => setCharteAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gold-hairline text-patina-deep focus:ring-patina-deep"
                />
                <span className="text-sm font-medium text-ink-base">
                  J'ai lu et j'accepte la charte de respect de Queer Service.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>
          )}

          <div className="mt-8 flex items-center justify-end">
            {step < 4 ? (
              <button onClick={next} disabled={!canProceed} className="flex items-center justify-center gap-2 rounded-xl bg-ink-base px-6 py-2.5 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
                Continuer <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={finishOnboarding} disabled={!canProceed || loading} className="flex items-center justify-center gap-2 rounded-xl bg-ink-base px-6 py-2.5 font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
                {loading ? 'Enregistrement…' : 'Finaliser mon inscription'}
                {!loading && <ArrowRight size={16} />}
              </button>
            )}
          </div>
          </div>
        </div>
      </div>

      {showAllyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-base/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-xl font-semibold text-ink-base mb-4">Charte des allié·es</h3>
            <div className="space-y-3 text-sm text-ink-muted mb-6">
              <p>En tant qu'allié·e sur cette plateforme communautaire, vous vous engagez à :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Respecter l'espace sécuritaire (safe space) créé pour la communauté.</li>
                <li>Faire preuve d'écoute, de bienveillance et d'ouverture.</li>
                <li>Ne pas porter de jugement sur les identités de genre et orientations sexuelles.</li>
                <li>Vous informer par vous-même sur les enjeux LGBTQIA+ si besoin.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowAllyModal(false); setIsAlly(false); }} className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink-base transition-colors">Annuler</button>
              <button onClick={() => { setShowAllyModal(false); setIsAlly(true); }} className="px-4 py-2 rounded-xl bg-ink-base text-white text-sm font-medium shadow-soft">J'accepte</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
