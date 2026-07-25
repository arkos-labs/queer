import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Avatar } from '@/components/Avatar';
import { CreateMissionRequestModal } from '@/components/CreateMissionRequestModal';
import { timeAgo } from '@/lib/utils';
import { ArrowLeft, Megaphone, PlusCircle, ChevronRight, Clock } from 'lucide-react';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <Megaphone size={26} className="text-primary-600" /> Missions recherchées
              </h1>
              <p className="mt-2 text-neutral-600">
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
            <Megaphone size={28} className="mx-auto text-neutral-300" />
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
              <div key={req.id} className="card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar name={req.profiles?.display_name ?? '?'} src={req.profiles?.photo_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold text-neutral-900">{req.title}</h2>
                      {req.budget && (
                        <span className="shrink-0 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                          {req.budget}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 whitespace-pre-line">{req.description}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-neutral-600">{req.profiles?.display_name ?? 'Membre'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(req.created_at)}</span>
                      </div>
                      {user && user.id !== req.created_by && (
                        <button
                          onClick={() => navigate(`/profil/${req.created_by}`)}
                          className="flex items-center gap-1 font-medium text-primary-600 hover:underline"
                        >
                          Proposer mes services <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateMissionRequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </div>
  );
}
