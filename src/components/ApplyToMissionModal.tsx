import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { X, Send, AlertTriangle, Sparkles } from 'lucide-react';

interface MissionForModal {
  id: string;
  title: string;
  created_by: string;
}

// Applying to a mission always goes through messaging: we open (or reuse)
// a connection with the poster, tag it with mission_request_id so a DB
// trigger can auto-close the mission once it's accepted, and send the
// applicant's pitch as the first message. This is where the applicant
// gets to stand out — a blank "Postuler" click wouldn't tell the poster
// anything about them.
export function ApplyToMissionModal({ mission, onClose }: { mission: MissionForModal; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [pitch, setPitch] = useState('');
  const [rateAmount, setRateAmount] = useState('');
  const [rateUnit, setRateUnit] = useState('/ prestation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    if (!pitch.trim()) {
      setError('Dites-en un peu plus sur pourquoi vous êtes la bonne personne pour cette mission.');
      return;
    }
    if (!profile?.charte_accepted) {
      setError("Acceptez d'abord la charte de respect depuis votre profil pour postuler.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: existing, error: findErr } = await supabase
      .from('connections')
      .select('*')
      .or(`and(user_a.eq.${user.id},user_b.eq.${mission.created_by}),and(user_a.eq.${mission.created_by},user_b.eq.${user.id})`)
      .maybeSingle();

    if (findErr) {
      setLoading(false);
      setError('Erreur : ' + findErr.message);
      return;
    }

    let connId = existing?.id as string | undefined;
    if (!connId) {
      const { data: created, error: connErr } = await supabase
        .from('connections')
        .insert({
          user_a: user.id,
          user_b: mission.created_by,
          service_label: mission.title.slice(0, 200),
          status: 'pending',
          mission_request_id: mission.id,
        })
        .select()
        .single();
      if (connErr) {
        setLoading(false);
        setError('Erreur : ' + connErr.message);
        return;
      }
      connId = created.id as string;
    } else if (!existing.mission_request_id) {
      // Tag the existing conversation with this mission so accepting it
      // later closes the mission automatically.
      await supabase.from('connections').update({ mission_request_id: mission.id }).eq('id', connId);
    }

    const finalRate = rateAmount.trim() ? `\n\nTarif proposé : ${rateAmount.trim()} ${rateUnit}` : '';
    
    const { error: msgErr } = await supabase.from('messages').insert({
      connection_id: connId,
      sender_id: user.id,
      body: `Candidature pour « ${mission.title} » : \n${pitch.trim()}${finalRate}`,
    });
    setLoading(false);
    if (msgErr) {
      setError('Erreur : ' + msgErr.message);
      return;
    }

    onClose();
    navigate(`/messages/${connId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="apply-modal-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md animate-scale-in p-6">
        <div className="flex items-center justify-between">
          <h3 id="apply-modal-title" className="flex items-center gap-2 font-display text-lg font-semibold text-neutral-900">
            <Sparkles size={18} className="text-primary-600" /> Postuler
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Présentez-vous pour « {mission.title} » : votre expérience, vos questions. Ce message part directement dans la messagerie.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="apply-pitch" className="label">Votre message</label>
            <textarea
              id="apply-pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={4}
              className="input mt-1"
              placeholder="Ex. Bonjour, je suis disponible ce weekend, est-ce que ça vous conviendrait ?"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Proposer un tarif (optionnel)</label>
            <div className="flex gap-2 mt-1">
              <input
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
                className="input flex-1"
                placeholder="Ex. 50€"
              />
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value)}
                className="input shrink-0 bg-neutral-50"
              >
                <option value="/ heure">/ heure</option>
                <option value="/ jour">/ jour</option>
                <option value="/ mois">/ mois</option>
                <option value="/ prestation">/ prestation</option>
              </select>
            </div>
            <p className="mt-1.5 text-xs text-neutral-400">Ce tarif sera inclus dans votre message à l'auteur·e.</p>
          </div>
        </div>
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={submit} disabled={loading || !pitch.trim()} className="btn-primary">
            <Send size={16} /> {loading ? 'Envoi…' : 'Envoyer ma candidature'}
          </button>
        </div>
      </div>
    </div>
  );
}
