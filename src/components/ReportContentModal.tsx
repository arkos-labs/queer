import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ReportTargetType } from '@/lib/types';

const REASONS = [
  'Harcèlement ou menaces',
  'Propos haineux ou LGBTQIAphobes',
  'Contenu sexuel non sollicité',
  'Arnaque ou usurpation d’identité',
  'Contenu illégal ou dangereux',
  'Autre',
];

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  title: string;
  onClose: () => void;
}

/** Signalement d'un contenu (profil, avis ou message) — traité par l'équipe sous 24 h. */
export function ReportContentModal({ targetType, targetId, title, onClose }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setSending(true);
    setError(null);
    const text = details.trim() ? `${reason} — ${details.trim()}` : reason;
    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: text,
    });
    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDone(true);
    setTimeout(onClose, 2200);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md p-6">
        <div className="flex items-center justify-between">
          <h3 id="report-title" className="font-display text-lg font-semibold text-neutral-900">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        {done ? (
          <p className="mt-4 text-sm text-success-600">
            Signalement envoyé. Notre équipe l’examine et agit sous 24 heures. Merci pour votre vigilance.
          </p>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-neutral-500">
              Tolérance zéro : les contenus abusifs sont retirés et leurs auteur·rice·s exclu·e·s sous 24 heures.
            </p>
            <label htmlFor="report-reason" className="mt-4 block text-sm font-medium text-neutral-800">Motif</label>
            <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input mt-1">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="input mt-3"
              placeholder="Précisions (facultatif)…"
              aria-label="Précisions"
            />
            {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="btn-ghost">Annuler</button>
              <button onClick={submit} disabled={sending} className="btn-secondary">
                {sending ? 'Envoi…' : 'Signaler'} <Flag size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
