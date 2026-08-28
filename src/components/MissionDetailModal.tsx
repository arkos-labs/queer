import { useState } from 'react';
import { X, Send, Clock, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

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

interface MissionDetailModalProps {
  mission: MissionRequest;
  onClose: () => void;
  onApply: () => void;
  onDelete?: () => void;
}

export function MissionDetailModal({ mission, onClose, onApply, onDelete }: MissionDetailModalProps) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette annonce ? Cette action est irréversible.')) return;
    setDeleting(true);
    const { error } = await supabase.from('mission_requests').delete().eq('id', mission.id);
    setDeleting(false);
    if (!error) {
      onClose();
      if (onDelete) onDelete();
    } else {
      alert('Erreur lors de la suppression : ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center bg-neutral-900/40 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative z-10 flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden animate-scale-in mt-auto md:mt-0">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-neutral-200 bg-white sticky top-0 z-10">
          <h3 className="font-display text-lg font-semibold text-neutral-900 truncate pr-4">
            Détails de l'annonce
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="shrink-0 rounded-full bg-neutral-100 p-2 text-neutral-500 hover:bg-neutral-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 md:p-6 space-y-6">
          <div>
            <div className="flex items-start gap-4">
              <button onClick={() => { onClose(); navigate(`/profil/${mission.created_by}`); }} className="shrink-0">
                <Avatar name={mission.profiles?.display_name ?? '?'} src={mission.profiles?.photo_url} size={48} />
              </button>
              <div className="flex-1 min-w-0">
                <button onClick={() => { onClose(); navigate(`/profil/${mission.created_by}`); }} className="font-semibold text-neutral-900 hover:text-primary-600 transition-colors text-left truncate block w-full">
                  {mission.profiles?.display_name ?? 'Membre'}
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-neutral-500">
                  <span className="flex items-center gap-1"><Clock size={12} /> Publiée {timeAgo(mission.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-4">{mission.title}</h2>
            {mission.budget && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2 text-primary-600 font-medium">
                <span className="text-xs uppercase tracking-wider text-primary-600/70 font-semibold">Budget indicatif :</span>
                <span className="text-sm font-bold">{mission.budget}</span>
              </div>
            )}
            
            <div className="prose prose-sm max-w-none text-neutral-900 whitespace-pre-line leading-relaxed">
              {mission.description}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-neutral-200 bg-neutral-100/50 mt-auto">
          {user && user.id !== mission.created_by ? (
            <button onClick={onApply} className="btn-primary w-full py-3 text-[15px]">
              <Send size={18} /> Contacter & proposer un tarif
            </button>
          ) : user && user.id === mission.created_by ? (
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="btn-outline w-full py-3 text-[15px] border-error-200 text-error-600 hover:bg-error-50 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} /> {deleting ? 'Suppression...' : 'Supprimer mon annonce'}
            </button>
          ) : (
            <button onClick={() => navigate('/connexion')} className="btn-primary w-full py-3 text-[15px]">
              Se connecter pour postuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
