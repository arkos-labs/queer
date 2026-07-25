import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Category, Subcategory, AccountType, Civilite } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FALLBACK_CATEGORIES, FALLBACK_SUBCATEGORIES } from '@/lib/taxonomy';
import { ArrowLeft, Save, X, Plus, CheckCircle2 } from 'lucide-react';

export function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    photo_url: '',
    city: '',
    civilite: '' as Civilite | '',
    pronouns: '',
    account_type: 'particulier' as AccountType,
    siret: '',
    intervention_zone: '',
    indicative_rates: '',
    skills: [] as string[],
    needs: [] as string[],
  });

  const [skillInput, setSkillInput] = useState('');
  const [needInput, setNeedInput] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [catRes, subRes, pscRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('subcategories').select('*').order('sort_order'),
          supabase.from('profile_subcategories').select('subcategory_id').eq('profile_id', user.id),
        ]);
        if (cancelled) return;
        if (catRes.error || subRes.error || !catRes.data?.length) {
          setCategories(FALLBACK_CATEGORIES);
          setSubcategories(FALLBACK_SUBCATEGORIES);
        } else {
          setCategories(catRes.data as Category[]);
          setSubcategories((subRes.data ?? []) as Subcategory[]);
        }
        setSelectedSubs(new Set((pscRes.data ?? []).map((x: { subcategory_id: string }) => x.subcategory_id)));
      } catch {
        if (cancelled) return;
        setCategories(FALLBACK_CATEGORIES);
        setSubcategories(FALLBACK_SUBCATEGORIES);
      }
      if (profile) {
        setForm({
          display_name: profile.display_name,
          bio: profile.bio ?? '',
          photo_url: profile.photo_url ?? '',
          city: profile.city ?? '',
          civilite: profile.civilite ?? '',
          pronouns: profile.pronouns ?? '',
          account_type: profile.account_type,
          siret: profile.siret ?? '',
          intervention_zone: profile.intervention_zone ?? '',
          indicative_rates: profile.indicative_rates ?? '',
          skills: profile.skills,
          needs: profile.needs,
        });
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, profile, navigate]);

  const toggleSub = (id: string) => {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !form.skills.includes(v)) {
      setForm((f) => ({ ...f, skills: [...f.skills, v] }));
      setSkillInput('');
    }
  };
  const removeSkill = (s: string) => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }));

  const addNeed = () => {
    const v = needInput.trim();
    if (v && !form.needs.includes(v)) {
      setForm((f) => ({ ...f, needs: [...f.needs, v] }));
      setNeedInput('');
    }
  };
  const removeNeed = (s: string) => setForm((f) => ({ ...f, needs: f.needs.filter((x) => x !== s) }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: upErr } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: form.display_name,
      email: user.email,
      bio: form.bio || null,
      photo_url: form.photo_url || null,
      city: form.city || null,
      civilite: form.civilite || null,
      pronouns: form.pronouns || null,
      account_type: form.account_type,
      siret: form.siret || null,
      intervention_zone: form.intervention_zone || null,
      indicative_rates: form.indicative_rates || null,
      skills: form.skills,
      needs: form.needs,
      charte_accepted: profile?.charte_accepted ?? true,
      charte_accepted_at: profile?.charte_accepted_at ?? new Date().toISOString(),
      profile_status: profile?.profile_status ?? 'active',
      updated_at: new Date().toISOString(),
    });

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    // Sync subcategories
    const toAdd = Array.from(selectedSubs).map((sid) => ({ profile_id: user.id, subcategory_id: sid }));
    const { error: delErr } = await supabase.from('profile_subcategories').delete().eq('profile_id', user.id);
    if (delErr) {
      setError(delErr.message);
      setSaving(false);
      return;
    }
    if (toAdd.length > 0) {
      const { error: insErr } = await supabase.from('profile_subcategories').insert(toAdd);
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="container-app py-16"><div className="card h-96 animate-pulse bg-neutral-100" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <button onClick={() => navigate('/profil')} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600">
            <ArrowLeft size={16} /> Mon profil
          </button>
          <h1 className="mt-3 font-display text-3xl font-semibold text-neutral-900">Modifier mon profil</h1>
        </div>
      </div>

      <div className="container-app max-w-3xl py-8">
        <div className="card p-6 md:p-8">
          {/* Identity */}
          <section>
            <h2 className="font-display text-lg font-semibold text-neutral-900">Identité</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nom affiché</label>
                <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Ville</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" placeholder="Ex. Paris" />
              </div>
              <div>
                <label className="label">Civilité</label>
                <select value={form.civilite} onChange={(e) => setForm({ ...form, civilite: e.target.value as Civilite | '' })} className="input">
                  <option value="">Non précisée</option>
                  <option value="Monsieur">Monsieur</option>
                  <option value="Madame">Madame</option>
                  <option value="Iel">Iel</option>
                </select>
              </div>
              <div>
                <label className="label">Pronoms</label>
                <input value={form.pronouns} onChange={(e) => setForm({ ...form, pronouns: e.target.value })} className="input" placeholder="iel / elle / il…" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Photo (URL)</label>
                <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} className="input" placeholder="https://…" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="input" placeholder="Présentez-vous en quelques mots…" />
              </div>
            </div>
          </section>

          {/* Account type */}
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Type de compte</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([['particulier', 'Particulier·e'], ['pro', 'Professionnel·le'], ['asso', 'Association']] as [AccountType, string][]).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, account_type: v })}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-medium transition',
                    form.account_type === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {/* Pro fields */}
          {form.account_type !== 'particulier' && (
            <section className="mt-8 animate-slide-up">
              <h2 className="font-display text-lg font-semibold text-neutral-900">Informations professionnelles</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">SIRET (optionnel)</label>
                  <input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Zone d'intervention</label>
                  <input value={form.intervention_zone} onChange={(e) => setForm({ ...form, intervention_zone: e.target.value })} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Tarifs indicatifs</label>
                  <input value={form.indicative_rates} onChange={(e) => setForm({ ...form, indicative_rates: e.target.value })} className="input" placeholder="Ex. 30€/h" />
                </div>
              </div>
            </section>
          )}

          {/* Services offered (subcategories) */}
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Services proposés</h2>
            <p className="mt-1 text-sm text-neutral-500">Sélectionnez les catégories dans lesquelles vous proposez vos services.</p>
            <div className="mt-4 space-y-4">
              {categories.map((cat) => {
                const subs = subcategories.filter((s) => s.category_id === cat.id);
                if (subs.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h3 className="text-sm font-semibold text-neutral-700">{cat.label}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {subs.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSub(s.id)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-xs font-medium transition',
                            selectedSubs.has(s.id)
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Skills */}
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Compétences</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="input"
                placeholder="Ex. Montage de meubles IKEA"
              />
              <button onClick={addSkill} className="btn-outline shrink-0">
                <Plus size={16} /> Ajouter
              </button>
            </div>
            {form.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm text-primary-700">
                    {s}
                    <button onClick={() => removeSkill(s)} className="text-primary-400 hover:text-primary-700">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Needs */}
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Recherche</h2>
            <p className="mt-1 text-sm text-neutral-500">Ce que vous cherchez au sein de la communauté.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={needInput}
                onChange={(e) => setNeedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeed())}
                className="input"
                placeholder="Ex. Aide administrative"
              />
              <button onClick={addNeed} className="btn-outline shrink-0">
                <Plus size={16} /> Ajouter
              </button>
            </div>
            {form.needs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.needs.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-secondary-50 px-3 py-1.5 text-sm text-secondary-700">
                    {s}
                    <button onClick={() => removeNeed(s)} className="text-secondary-400 hover:text-secondary-700">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {error && <div className="mt-6 rounded-xl bg-error-50 p-3 text-sm text-error-700">{error}</div>}

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-neutral-100 pt-6">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-600">
                <CheckCircle2 size={16} /> Enregistré
              </span>
            )}
            <button onClick={() => navigate('/profil')} className="btn-ghost">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'} <Save size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
