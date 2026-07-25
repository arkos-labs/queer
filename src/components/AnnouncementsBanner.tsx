import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Megaphone, PlusCircle, ChevronRight, Clock } from 'lucide-react';
import { CreateMissionRequestModal } from './CreateMissionRequestModal';
import { timeAgo } from '@/lib/utils';
import { useRouter } from '@/lib/router';

interface MissionRequest {
  id: string;
  title: string;
  description: string;
  budget?: string;
  created_at: string;
  created_by: string;
  profiles: {
    display_name: string;
  };
}

export function AnnouncementsBanner() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [requests, setRequests] = useState<MissionRequest[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error, count } = await supabase
      .from('mission_requests')
      .select('id, title, description, budget, created_at, created_by, profiles(display_name)', { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setRequests(data as any);
      setTotalCount(count);
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

  if (loading && requests.length === 0) {
    return (
      <div className="mx-4 mb-6 rounded-2xl bg-neutral-50 p-4 animate-pulse">
        <div className="h-6 w-1/3 bg-neutral-200 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-4 mb-6 overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-sm">
        <div className="flex items-center justify-between border-b border-primary-100/50 bg-white/50 px-4 py-3">
          <div className="flex items-center gap-2 text-primary-700">
            <Megaphone size={18} />
            <h2 className="font-semibold">
              Missions recherchées
              {totalCount !== null && totalCount > 0 && (
                <span className="ml-2 text-xs font-medium text-primary-500 bg-primary-100 px-2 py-0.5 rounded-full">
                  {totalCount} en cours
                </span>
              )}
            </h2>
          </div>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <PlusCircle size={14} /> Publier
            </button>
          )}
        </div>

        <div className="p-4">
          {requests.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-2">
              Aucune mission recherchée pour le moment.
            </p>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x">
              {requests.map((req) => (
                <div key={req.id} className="group relative shrink-0 w-[260px] snap-start rounded-xl border border-neutral-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-medium text-neutral-900">{req.title}</h3>
                        {req.budget && (
                          <span className="shrink-0 bg-primary-50 text-primary-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary-100">
                            {req.budget}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{req.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate font-medium text-neutral-700">{req.profiles?.display_name}</span>
                      <span>•</span>
                      <span className="flex shrink-0 items-center gap-1"><Clock size={10} /> {timeAgo(req.created_at)}</span>
                    </div>
                    {user && user.id !== req.created_by && (
                      <button
                        onClick={() => navigate(`/profil/${req.created_by}`)}
                        className="flex shrink-0 items-center gap-1 font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Proposer <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && <CreateMissionRequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </>
  );
}
