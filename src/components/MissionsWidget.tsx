import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { timeAgo } from '@/lib/utils';
import { Megaphone, PlusCircle } from 'lucide-react';
import { CreateMissionRequestModal } from './CreateMissionRequestModal';

interface OpenMission {
  id: string;
  title: string;
  budget: string | null;
  created_at: string;
}

// "Missions recherchées" teaser, floating on every app page — supersedes
// AnnouncementsBanner, which only ever rendered on DirectoryPage, so open
// mission requests were invisible anywhere else in the app.
export function MissionsWidget() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [missions, setMissions] = useState<OpenMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMissions = async () => {
    const { data } = await supabase
      .from('mission_requests')
      .select('id, title, budget, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);
    setMissions((data ?? []) as OpenMission[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchMissions();

    const channel = supabase
      .channel('missions-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_requests' }, () => {
        fetchMissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchMissions();
  };

  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Missions recherchées"
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-900 hover:border-secondary-300 hover:bg-secondary-50 transition-all duration-200 shadow-sm relative"
      >
        <Megaphone size={20} className="text-secondary-600" />
        {missions.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-secondary-600 text-white px-1 text-[9px] font-bold leading-none">
            {missions.length > 9 ? '9+' : missions.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 mt-2 w-80 rounded-2xl bg-white/95 backdrop-blur-xl z-50 overflow-hidden animate-slide-up origin-top-left"
            style={{ boxShadow: '0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(139,92,246,0.08)' }}
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-neutral-900 tracking-widest uppercase">Missions recherchées</h3>
              <button
                onClick={() => { setOpen(false); setShowCreateModal(true); }}
                className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:brightness-110"
              >
                <PlusCircle size={12} /> Publier
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-text-muted">Chargement…</div>
              ) : missions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-muted">Aucune mission ouverte pour le moment.</div>
              ) : (
                missions.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setOpen(false); navigate('/missions'); }}
                    className="w-full text-left px-4 py-3 border-b border-neutral-200 hover:bg-neutral-100 transition-colors"
                  >
                    <p className="text-sm font-semibold text-neutral-900 truncate">{m.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {m.budget && <span className="text-[11px] font-medium text-secondary-700">{m.budget}</span>}
                      <span className="text-[10px] font-medium text-text-faint ml-auto">{timeAgo(m.created_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setOpen(false); navigate('/missions'); }}
              className="w-full px-4 py-2.5 text-center text-[11px] font-bold text-secondary-700 uppercase tracking-wider hover:bg-neutral-50 border-t border-neutral-100"
            >
              Voir toutes les missions
            </button>
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateMissionRequestModal onClose={() => setShowCreateModal(false)} onSuccess={handleCreated} />
      )}
    </div>
  );
}
