import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { supabase, PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Connection, Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { PaymentPanel } from '@/components/PaymentPanel';

/**
 * Page de paiement d'une prestation : prix, acceptation, saisie de la carte, confirmation
 * de fin de prestation. Accessible depuis un bouton de la conversation.
 */
export function PaymentPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: conn } = await supabase.from('connections').select('*').eq('id', id).maybeSingle();
      if (cancelled) return;
      const c = conn as Connection | null;
      if (!c || (c.user_a !== user.id && c.user_b !== user.id)) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setConnection(c);
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const { data: prof } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', otherId).maybeSingle();
      if (cancelled) return;
      setOther((prof ?? null) as Profile | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, user]);

  const acceptMission = async () => {
    if (!connection) return;
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', connection.id);
    if (!error) setConnection({ ...connection, status: 'accepted' });
  };

  if (!user) return null;

  if (loading) {
    return <div className="container-app py-10"><div className="card h-64 animate-pulse bg-neutral-100" /></div>;
  }

  if (notFound || !connection) {
    return (
      <div className="container-app py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-neutral-900">Paiement introuvable</h2>
        <p className="mt-2 text-neutral-500">Cette conversation n'existe plus ou vous n'y avez pas accès.</p>
        <button onClick={() => navigate('/messages')} className="btn-primary mt-6">Retour aux messages</button>
      </div>
    );
  }

  const otherName = other?.display_name ?? 'ce membre';

  return (
    <div className="container-app max-w-xl py-6 pb-24">
      <button onClick={() => navigate(`/messages/${connection.id}`)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600">
        <ArrowLeft size={16} /> Retour à la conversation
      </button>

      <div className="card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-base text-patina-deep"><CreditCard size={20} /></span>
          <div>
            <h1 className="font-display text-xl font-semibold text-neutral-900">Paiement</h1>
            <p className="text-sm text-neutral-500">{connection.service_label ?? 'Prestation'}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gold-hairline bg-white/70 p-3">
          <Avatar name={otherName} src={other?.photo_url} size={40} className="border border-gold-hairline bg-paper-base text-ink-muted" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-base">{otherName}</p>
            <p className="text-xs text-ink-muted">Prestation avec cette personne</p>
          </div>
        </div>

        <div className="mt-5 -mx-4 overflow-hidden rounded-2xl border border-gold-hairline">
          <PaymentPanel connection={connection} meId={user.id} otherName={otherName.split(' ')[0]} onAccept={acceptMission} />
        </div>

        <ul className="mt-5 space-y-2 text-xs text-ink-muted">
          <li className="flex items-start gap-2"><Lock size={14} className="mt-0.5 shrink-0" /> Paiement sécurisé par Stripe : Queer Services ne voit jamais votre carte.</li>
          <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Votre carte est seulement réservée. Elle n'est débitée que lorsque vous confirmez que la prestation est terminée.</li>
        </ul>
      </div>
    </div>
  );
}
