import { useEffect, useState } from 'react';
import { supabase, edgeFunctionErrorMessage, invokeEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Profile } from '@/lib/types';
import { PriceInput } from '@/components/PriceInput';
import { X, CreditCard, AlertTriangle, MessageSquare, Loader2, Calendar } from 'lucide-react';

const SLOTS: { value: 'morning' | 'afternoon' | 'evening' | 'exact'; label: string; time: string }[] = [
  { value: 'morning', label: 'Matin (8h-12h)', time: '09:00' },
  { value: 'afternoon', label: 'Après-midi (12h-18h)', time: '14:00' },
  { value: 'evening', label: 'Soir (18h-22h)', time: '19:00' },
  { value: 'exact', label: 'Heure précise', time: '' },
];

// This modal only sends a price request — it never asks for a card. The
// provider has to accept the mission first; card entry then happens from
// the conversation itself (see PayNowModal / MessageThreadPage).
export function PaymentRequestModal({ target, onClose }: { target: Profile; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [description, setDescription] = useState('');
  const [priceEuros, setPriceEuros] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceSlot, setServiceSlot] = useState<'morning' | 'afternoon' | 'evening' | 'exact' | ''>('');
  const [serviceTime, setServiceTime] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Before showing the form, check whether the client already has an
  // unfinished paid request with this same provider — a client can't
  // have two active price negotiations/payments on one connection at
  // once (see stripe-request-payment's duplicate check). Rather than let
  // that surface as a raw server error, we detect it upfront and let the
  // person either jump back into the existing conversation or explicitly
  // confirm this is a different service, which opens a brand-new
  // conversation for it instead of colliding with the first one.
  const [checking, setChecking] = useState(true);
  const [existingConnectionId, setExistingConnectionId] = useState<string | null>(null);
  const [differentService, setDifferentService] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) return;
      const { data: conns } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user_a.eq.${user.id},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${user.id})`);
      if (cancelled) return;
      const connIds = (conns ?? []).map((c) => c.id);
      if (!connIds.length) {
        setChecking(false);
        return;
      }
      const { data: pendingPayment } = await supabase
        .from('payments')
        .select('id, status, connection_id')
        .in('connection_id', connIds)
        .in('status', ['pending', 'authorized'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (pendingPayment) setExistingConnectionId(pendingPayment.connection_id);
      setChecking(false);
    };
    check().catch(() => setChecking(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  const priceValue = Number(priceEuros.replace(',', '.'));
  const canSubmit = description.trim().length > 0 && priceValue >= 1 && !loading;

  const scheduledAtIso = (() => {
    if (!serviceDate || !serviceSlot) return null;
    const time = serviceSlot === 'exact' ? serviceTime : SLOTS.find((s) => s.value === serviceSlot)?.time;
    if (!time) return null;
    const d = new Date(`${serviceDate}T${time}:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  })();

  // The PaymentOfferCard shows the price/date separately below the
  // message, but the first message itself was only ever the raw
  // description — all the detail typed into the form (price, date,
  // time slot, location) never made it into the actual chat text. Fold
  // it all into the message body so the conversation is self-contained
  // even before scrolling down to the offer card.
  const buildMessageBody = () => {
    const details: string[] = [];
    if (Number.isFinite(priceValue) && priceValue >= 1) {
      details.push(`Tarif proposé : ${priceValue.toLocaleString('fr-FR')}€`);
    }
    if (serviceDate) {
      const dateLabel = new Date(`${serviceDate}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const slotLabel =
        serviceSlot === 'exact' ? serviceTime : SLOTS.find((s) => s.value === serviceSlot)?.label;
      details.push(`Date souhaitée : ${dateLabel}${slotLabel ? ` — ${slotLabel}` : ''}`);
    }
    if (serviceLocation.trim()) details.push(`Lieu : ${serviceLocation.trim()}`);
    return details.length ? `${description.trim()}\n\n${details.join('\n')}` : description.trim();
  };

  const sendRequest = async () => {
    if (!user || !canSubmit) return;
    if (!profile?.charte_accepted) {
      setError("Acceptez d'abord la charte de respect depuis votre profil pour envoyer une demande.");
      return;
    }
    setLoading(true);
    setError(null);

    let connId: string;
    if (existingConnectionId && !differentService) {
      // Shouldn't normally get here (the form is gated behind the
      // checkbox in this case), but guard anyway.
      connId = existingConnectionId;
    } else if (existingConnectionId && differentService) {
      // Explicitly a different service — open a brand-new conversation
      // rather than reusing the one with the pending request.
      const { data: created, error: connErr } = await supabase
        .from('connections')
        .insert({
          user_a: user.id,
          user_b: target.id,
          service_label: description.trim().slice(0, 200),
          status: 'pending',
        })
        .select()
        .single();
      if (connErr) {
        setLoading(false);
        setError('Erreur : ' + connErr.message);
        return;
      }
      connId = created.id as string;
    } else {
      // Reuse an existing conversation between the two members if there is one.
      const { data: existing, error: findErr } = await supabase
        .from('connections')
        .select('*')
        .or(`and(user_a.eq.${user.id},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) {
        setLoading(false);
        setError('Erreur : ' + findErr.message);
        return;
      }

      connId = existing?.id as string | undefined ?? '';
      if (!connId) {
        const { data: created, error: connErr } = await supabase
          .from('connections')
          .insert({
            user_a: user.id,
            user_b: target.id,
            service_label: description.trim().slice(0, 200),
            status: 'pending',
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
    }

    const { error: msgErr } = await supabase
      .from('messages')
      .insert({ connection_id: connId, sender_id: user.id, body: buildMessageBody() });
    if (msgErr) {
      setLoading(false);
      setError('Erreur : ' + msgErr.message);
      return;
    }

    const { data, error: fnErr } = await invokeEdgeFunction<{ payment_id?: string }>('stripe-request-payment', {
      connection_id: connId,
      amount: Math.round(priceValue * 100),
      description: description.trim(),
      scheduled_at: scheduledAtIso,
      service_date: serviceDate || null,
      service_time: serviceSlot === 'exact' ? serviceTime : serviceSlot || null,
      service_location: serviceLocation.trim() || null,
    });

    setLoading(false);

    if (fnErr) {
      setError(await edgeFunctionErrorMessage(fnErr, "Impossible d'envoyer la demande."));
      return;
    }
    if (!data?.payment_id) {
      setError("Impossible d'envoyer la demande.");
      return;
    }

    onClose();
    navigate(`/messages/${connId}`);
  };

  const showDuplicateNotice = !checking && existingConnectionId && !differentService;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="payment-request-title">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md animate-scale-in p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 id="payment-request-title" className="font-display text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <CreditCard size={18} className="text-primary-600" /> Demander un service payant
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        {checking ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 py-6 text-sm text-neutral-400">
            <Loader2 size={20} className="animate-spin" />
            Vérification…
          </div>
        ) : (
          <>
            {existingConnectionId && (
              <div className="mt-4 rounded-xl bg-warning-50 p-4 text-sm text-warning-800">
                <p className="font-medium">Vous avez déjà une demande en cours avec {target.display_name}.</p>
                <p className="mt-1 text-warning-700">
                  Si c'est pour la même demande, retrouvez-la dans votre conversation. Si c'est pour un service
                  différent, cochez la case ci-dessous pour envoyer une nouvelle demande.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/messages/${existingConnectionId}`);
                  }}
                  className="btn-outline btn-sm mt-3"
                >
                  <MessageSquare size={14} /> Voir la conversation
                </button>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-warning-100 pt-3">
                  <input
                    type="checkbox"
                    checked={differentService}
                    onChange={(e) => setDifferentService(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-warning-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs font-medium text-warning-800">
                    Il s'agit d'un service différent — je veux envoyer une nouvelle demande.
                  </span>
                </label>
              </div>
            )}

            {!showDuplicateNotice && (
              <>
                <p className="mt-2 text-sm text-neutral-500">
                  Décrivez le service et proposez un prix. {target.display_name} recevra votre demande et devra
                  d'abord l'accepter — vous ne serez invité·e à entrer votre carte qu'une fois la mission acceptée.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="pr-description" className="mb-1 block text-sm font-medium text-neutral-900">Description du service</label>
                    <textarea
                      id="pr-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="input"
                      placeholder="Ex. Montage d'une bibliothèque Ikea, samedi après-midi."
                    />
                  </div>
                  <div>
                    <label htmlFor="pr-price" className="mb-1 block text-sm font-medium text-neutral-900">Prix proposé</label>
                    <PriceInput id="pr-price" value={priceEuros} onChange={setPriceEuros} placeholder="30" />
                    {target.indicative_rates && (
                      <p className="mt-1.5 text-xs text-neutral-400">
                        Tarifs indicatifs de {target.display_name} : {target.indicative_rates}. Si le travail s'avère
                        plus long ou complexe, {target.display_name} pourra vous proposer un autre prix une fois la
                        demande envoyée.
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="pr-date" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                      <Calendar size={14} /> Date de la prestation (optionnel)
                    </label>
                    <input
                      id="pr-date"
                      type="date"
                      value={serviceDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="input"
                    />
                    {serviceDate && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {SLOTS.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setServiceSlot(s.value)}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                              serviceSlot === s.value
                                ? 'border-primary-500 bg-primary-50 text-primary-600'
                                : 'border-neutral-200 text-neutral-500 hover:border-neutral-200'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {serviceSlot === 'exact' && (
                      <input
                        type="time"
                        value={serviceTime}
                        onChange={(e) => setServiceTime(e.target.value)}
                        className="input mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="pr-location" className="mb-1 block text-sm font-medium text-neutral-900">Lieu de la prestation (optionnel)</label>
                    <input
                      id="pr-location"
                      value={serviceLocation}
                      onChange={(e) => setServiceLocation(e.target.value)}
                      className="input"
                      placeholder="Ex: À distance, ou Paris 11e"
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
                  <button onClick={sendRequest} disabled={!canSubmit} className="btn-primary">
                    {loading ? 'Envoi…' : 'Envoyer la demande'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
