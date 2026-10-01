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
// a connection with the poster dedicated to THIS mission, tag it with
// mission_request_id so a DB trigger can auto-close the mission once it's
// accepted, and send the applicant's pitch as the first message. This is
// where the applicant gets to stand out — a blank "Postuler" click
// wouldn't tell the poster anything about them.
//
// Deliberately scoped per mission rather than reusing whatever connection
// already exists between the two people: the same client and provider
// can have several independent missions on the go (or one finished and a
// new one starting), each with its own rate discussion — reusing another
// mission's connection, or a generic contact thread, would mix them up.
export function ApplyToMissionModal({ mission, onClose }: { mission: MissionForModal; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [pitch, setPitch] = useState('');
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

    // Only reuse a connection that's already dedicated to THIS mission
    // (e.g. re-opening the modal on a mission already applied to) — never
    // one left over from a different mission or a generic contact thread,
    // so each application's payment negotiation stays independent.
    const { data: existing, error: findErr } = await supabase
      .from('connections')
      .select('*')
      .eq('mission_request_id', mission.id)
      .or(`and(user_a.eq.${user.id},user_b.eq.${mission.created_by}),and(user_a.eq.${mission.created_by},user_b.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(1)
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
    }

    const { error: msgErr } = await supabase.from('messages').insert({
      connection_id: connId,
      sender_id: user.id,
      body: `Candidature pour « ${mission.title} » :\n${pitch.trim()}`,
    });
    if (msgErr) {
      setLoading(false);
      setError('Erreur : ' + msgErr.message);
      return;
    }

    setLoading(false);

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
