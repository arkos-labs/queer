import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import type { Profile, Report, Category } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import {
  Shield,
  ShieldCheck,
  Users,
  Flag,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Plus,
  X,
} from 'lucide-react';

type Tab = 'profiles' | 'reports' | 'categories';

export function AdminPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('profiles');

  if (!user) {
    navigate('/connexion');
    return null;
  }
  if (profile && !profile.is_admin) {
    return (
      <div className="container-app py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Shield size={26} />
        </div>
        <h2 className="font-display text-2xl font-semibold text-neutral-900">Accès réservé</h2>
        <p className="mt-2 text-sm text-neutral-500">Cette section est réservée aux administrateurs.</p>
        <button onClick={() => navigate('/annuaire')} className="btn-primary mt-6">Retour à l'annuaire</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-neutral-900">Back-office</h1>
              <p className="text-sm text-neutral-500">Administration et modération de la communauté.</p>
            </div>
          </div>

          <div className="mt-5 flex gap-1 overflow-x-auto">
            {([
              { id: 'profiles' as Tab, label: 'Profils', icon: Users },
              { id: 'reports' as Tab, label: 'Signalements', icon: Flag },
              { id: 'categories' as Tab, label: 'Catégories', icon: LayoutGrid },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                  tab === t.id ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                )}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-app py-8">
        {tab === 'profiles' && <ProfilesTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
}

function ProfilesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'suspended' | 'banned'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!cancelled) {
        setProfiles((data ?? []) as Profile[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const updateStatus = async (id: string, status: Profile['profile_status']) => {
    const { error } = await supabase.from('profiles').update({ profile_status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, profile_status: status } : p)));
  };

  const toggleVerification = async (p: Profile) => {
    const nowVerified = p.verification_status === 'verified';
    const patch = nowVerified
      ? { verification_status: 'none' as const, verified_at: null }
      : { verification_status: 'verified' as const, verified_at: new Date().toISOString() };
    const { error } = await supabase.from('profiles').update(patch).eq('id', p.id);
    if (!error) setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  };

  const filtered = filter === 'all' ? profiles : profiles.filter((p) => p.profile_status === filter);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['all', 'pending', 'suspended', 'banned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              filter === f ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            )}
          >
            {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'suspended' ? 'Suspendus' : 'Bannis'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-neutral-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-neutral-500">Aucun profil dans cette catégorie.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="card flex items-center gap-4 p-4">
              <Avatar name={p.display_name} src={p.photo_url} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">{p.display_name}</p>
                <p className="truncate text-xs text-neutral-500">{p.email} · {p.account_type} · {p.city ?? '—'}</p>
              </div>
              {p.verification_status === 'verified' && (
                <span className="hidden items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 sm:inline-flex">
                  <ShieldCheck size={12} /> Vérifié
                </span>
              )}
              <span className={cn(
                'hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block',
                p.profile_status === 'active' && 'bg-success-100 text-success-700',
                p.profile_status === 'pending' && 'bg-warning-100 text-warning-700',
                p.profile_status === 'suspended' && 'bg-neutral-200 text-neutral-700',
                p.profile_status === 'banned' && 'bg-error-100 text-error-700',
              )}>
                {p.profile_status}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleVerification(p)}
                  className={cn(
                    'btn-ghost btn-sm',
                    p.verification_status === 'verified' ? 'text-primary-600 hover:bg-primary-50' : 'text-neutral-400 hover:bg-neutral-100',
                  )}
                  title={p.verification_status === 'verified' ? "Retirer la vérification d'identité" : "Vérifier l'identité"}
                  aria-label={p.verification_status === 'verified' ? `Retirer la vérification d'identité de ${p.display_name}` : `Vérifier l'identité de ${p.display_name}`}
                >
                  <ShieldCheck size={16} />
                </button>
                {p.profile_status !== 'active' && (
                  <button onClick={() => updateStatus(p.id, 'active')} className="btn-ghost btn-sm text-success-600 hover:bg-success-50" title="Activer" aria-label={`Activer le profil de ${p.display_name}`}>
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {p.profile_status !== 'suspended' && (
                  <button onClick={() => updateStatus(p.id, 'suspended')} className="btn-ghost btn-sm text-warning-600 hover:bg-warning-50" title="Suspendre" aria-label={`Suspendre le profil de ${p.display_name}`}>
                    <Clock size={16} />
                  </button>
                )}
                {p.profile_status !== 'banned' && (
                  <button onClick={() => updateStatus(p.id, 'banned')} className="btn-ghost btn-sm text-error-600 hover:bg-error-50" title="Bannir" aria-label={`Bannir le profil de ${p.display_name}`}>
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<(Report & { reporter?: Pick<Profile, 'display_name'> })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(display_name)')
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setReports((data ?? []) as (Report & { reporter?: Pick<Profile, 'display_name'> })[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const updateStatus = async (id: string, status: Report['status']) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (!error) setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  if (loading) return <div className="card h-64 animate-pulse bg-neutral-100" />;

  if (reports.length === 0) return <div className="card p-10 text-center text-sm text-neutral-500">Aucun signalement. Tout va bien !</div>;

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  r.status === 'open' && 'bg-error-100 text-error-700',
                  r.status === 'reviewing' && 'bg-warning-100 text-warning-700',
                  r.status === 'resolved' && 'bg-success-100 text-success-700',
                  r.status === 'dismissed' && 'bg-neutral-100 text-neutral-600',
                )}>
                  {r.status === 'open' ? 'Ouvert' : r.status === 'reviewing' ? 'En cours' : r.status === 'resolved' ? 'Résolu' : 'Écarté'}
                </span>
                <span className="text-xs text-neutral-400">par {r.reporter?.display_name ?? 'Inconnu'} · {timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                <span className="font-medium">{r.target_type === 'profile' ? 'Profil' : r.target_type === 'review' ? 'Avis' : 'Message'} :</span>{' '}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{r.target_id.slice(0, 8)}</code>
              </p>
              <p className="mt-2 text-sm text-neutral-600">{r.reason}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {r.status !== 'resolved' && (
                <button onClick={() => updateStatus(r.id, 'resolved')} className="btn-ghost btn-sm text-success-600 hover:bg-success-50" title="Résoudre" aria-label="Marquer ce signalement comme résolu">
                  <CheckCircle2 size={16} />
                </button>
              )}
              {r.status !== 'dismissed' && (
                <button onClick={() => updateStatus(r.id, 'dismissed')} className="btn-ghost btn-sm text-neutral-500 hover:bg-neutral-100" title="Écarter" aria-label="Écarter ce signalement">
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      if (!cancelled) {
        setCategories((data ?? []) as Category[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const addCategory = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const slug = slugify(newLabel);
    const { data, error } = await supabase.from('categories').insert({
      label: newLabel.trim(),
      slug,
      sort_order: categories.length + 1,
    }).select().single();
    setAdding(false);
    if (!error && data) {
      setCategories((prev) => [...prev, data as Category]);
      setNewLabel('');
    }
  };

  const removeCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) return <div className="card h-64 animate-pulse bg-neutral-100" />;

  return (
    <div>
      <div className="card mb-6 p-5">
        <h3 className="font-display text-lg font-semibold text-neutral-900">Ajouter une catégorie</h3>
        <div className="mt-3 flex gap-2">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="input" placeholder="Ex. Nouvelle catégorie" />
          <button onClick={addCategory} disabled={adding || !newLabel.trim()} className="btn-primary shrink-0">
            <Plus size={16} /> {adding ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="card flex items-center gap-4 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <LayoutGrid size={16} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{c.label}</p>
              <p className="text-xs text-neutral-400">{c.slug}</p>
            </div>
            <button onClick={() => removeCategory(c.id)} className="btn-ghost btn-sm text-error-600 hover:bg-error-50" title="Supprimer" aria-label={`Supprimer la catégorie ${c.label}`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
