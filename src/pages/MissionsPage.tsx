import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Avatar } from '@/components/Avatar';
import { CreateMissionRequestModal } from '@/components/CreateMissionRequestModal';
import { ApplyToMissionModal } from '@/components/ApplyToMissionModal';
import { MissionDetailModal } from '@/components/MissionDetailModal';
import { timeAgo } from '@/lib/utils';
import { ArrowLeft, Megaphone, PlusCircle, Send, Clock } from 'lucide-react';

interface MissionRequest {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  created_at: string;
  created_by: string;
  profiles: {
    display_name: string;
    photo_url: string | null;
  } | null;
}

// Full listing of all open mission requests, Indeed-style: one row per
// posting, most recent first. AnnouncementsBanner on the directory only
// shows a teaser (count + publish button) — this page is where members
// actually browse everything that's open.
export function MissionsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [requests, setRequests] = useState<MissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [detailTarget, setDetailTarget] = useState<MissionRequest | null>(null);
  const [applyTarget, setApplyTarget] = useState<MissionRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('mission_requests')
      .select('id, title, description, budget, created_at, created_by, profiles(display_name, photo_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setRequests((data ?? []) as unknown as MissionRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSuccess = () => {
    setShowModal(false);
    fetchRequests();
  };

  return (
    <div className="animate-fade-in">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-6">
          <button
            onClick={() => navigate('/annuaire')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-primary-600"
          >
            <ArrowLeft size={16} /> Annuaire
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-neutral-900">
                <Megaphone size={26} className="text-primary-600" /> Missions <span className="gradient-text">recherchées</span>
              </h1>
              <p className="mt-2 text-neutral-500">
                Toutes les demandes ouvertes par des membres de la communauté, du plus récent au plus ancien.
              </p>
            </div>
            {user && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <PlusCircle size={16} /> Publier une annonce
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container-app max-w-3xl py-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-24 animate-pulse bg-neutral-100" />
            ))}
          </div>
        ) : error ? (
          <div className="card p-8 text-center text-sm text-error-600">{error}</div>
        ) : requests.length === 0 ? (
          <div className="card p-10 text-center">
            <Megaphone size={28} className="mx-auto text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">Aucune mission recherchée pour le moment.</p>
            {user && (
              <button onClick={() => setShowModal(true)} className="btn-outline btn-sm mt-4">
                <PlusCircle size={14} /> Publier la première annonce
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div 
                key={req.id} 
                onClick={() => setDetailTarget(req)}
                className="card group cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => navigate(`/profil/${req.created_by}`)}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    <Avatar name={req.profiles?.display_name ?? '?'} src={req.profiles?.photo_url} size={28} />
                    <span className="truncate text-sm text-neutral-500">
                      <span className="font-medium text-neutral-900">{req.profiles?.display_name ?? 'Membre'}</span>
                      {' · '}
                      <span className="inline-flex items-center gap-1"><Clock size={11} className="inline" /> {timeAgo(req.created_at)}</span>
                    </span>
                  </button>
                  {req.budget && (
                    <span className="badge-chip shrink-0 border border-primary-100 bg-primary-50 text-primary-600">
                      {req.budget}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 font-display text-lg font-semibold text-neutral-900">{req.title}</h2>
                <p className="mt-1 text-sm text-neutral-500 whitespace-pre-line">{req.description}</p>

                {user && user.id !== req.created_by ? (
                  <button onClick={(e) => { e.stopPropagation(); setApplyTarget(req); }} className="btn-primary mt-4 w-full group-hover:scale-[1.01] transition-transform">
                    <Send size={15} /> Postuler
                  </button>
                ) : user && user.id === req.created_by ? (
                  <p className="mt-4 text-center text-xs font-medium text-neutral-400">Votre annonce</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateMissionRequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
      {detailTarget && (
        <MissionDetailModal 
          mission={detailTarget} 
          onClose={() => setDetailTarget(null)}
          onApply={() => {
            setApplyTarget(detailTarget);
            setDetailTarget(null);
          }}
          onDelete={handleSuccess}
        />
      )}
      {applyTarget && (
        <ApplyToMissionModal
          mission={{ id: applyTarget.id, title: applyTarget.title, created_by: applyTarget.created_by }}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  );
}
