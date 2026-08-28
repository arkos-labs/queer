import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Megaphone, PlusCircle, ChevronRight } from 'lucide-react';
import { CreateMissionRequestModal } from './CreateMissionRequestModal';
import { useRouter } from '@/lib/router';

// Teaser only — just the count of open mission requests and a way to
// publish one. The full Indeed-style listing lives on its own page
// (MissionsPage, at /missions); clicking anywhere on this banner (other
// than "Publier") takes you there.
export function AnnouncementsBanner() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchCount = async () => {
    setLoading(true);
    const { count } = await supabase
      .from('mission_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchCount();
  }, []);

  const handleSuccess = () => {
    setShowModal(false);
    fetchCount();
  };

  if (loading) {
    return (
      <div className="mx-4 mb-6 rounded-2xl bg-neutral-100 p-4 animate-pulse">
        <div className="h-6 w-1/3 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate('/missions')}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/missions')}
        className="mx-4 mb-6 flex cursor-pointer items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-secondary-600 to-accent-600 px-4 py-3 shadow-md transition-all hover:shadow-lg hover:scale-[1.01]"
      >
        <div className="flex flex-1 items-center gap-2.5 text-white">
          <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
            <Megaphone size={18} className="text-white" />
          </div>
          <h2 className="font-semibold text-white flex items-center flex-wrap gap-2">
            Missions recherchées
            {totalCount !== null && totalCount > 0 && (
              <span className="whitespace-nowrap text-[11px] font-bold text-secondary-700 bg-white px-2 py-0.5 rounded-full shadow-sm">
                {totalCount} en cours
              </span>
            )}
          </h2>
          <ChevronRight size={16} className="text-white/70 ml-auto mr-2" />
        </div>
        {user && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-secondary-700 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <PlusCircle size={14} /> Publier
          </button>
        )}
      </div>

      {showModal && <CreateMissionRequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </>
  );
}
